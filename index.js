const NefitEasyClient = require('nefit-easy-commands');
var Service, Characteristic;

module.exports = function(homebridge) {
  Service        = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-nefit-easy', 'NefitEasy', NefitEasyAccessory);
};

function NefitEasyAccessory(log, config) {
  this.log     = log;
  this.name    = config.name;

  // Make sure that the credentials are there.
  var creds = config.options || config.authentication;
  if (! creds || typeof creds.serialNumber !== 'string' ||
      typeof creds.accessKey !== 'string' || typeof creds.password !== 'string') {
    throw Error('[homebridge-nefit-easy] Invalid/missing credentials in configuration file.');
  }

  this.serialNumber = creds.serialNumber;

  this.thermostatService = new Service.Thermostat(this.name);
  this.outdoorTempService = new Service.TemperatureSensor(this.name + " outdoor temp");
  this.client  = NefitEasyClient(creds);

  // Establish connection with device.
  this.client.connect().catch((e) => {
    throw error(e);
  });

  this.thermostatService
    .getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', (callback) => callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS));

  this.thermostatService
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', this.getTemperature.bind(this, 'current', 'in house temp', true));

  this.thermostatService
    .getCharacteristic(Characteristic.TargetTemperature)
    .on('get', this.getTemperature.bind(this, 'target', 'temp setpoint', true))
    .on('set', this.setTemperature.bind(this))
    .setProps({minValue: 5, maxValue: 30, minStep: 0.5});

  this.thermostatService
    .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', this.getCurrentState.bind(this))
    .setProps(
      {validValues:
        [Characteristic.CurrentHeatingCoolingState.OFF, 
         Characteristic.CurrentHeatingCoolingState.HEAT]
      });

  this.thermostatService
    .getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('get', (callback) => callback(null, Characteristic.TargetHeatingCoolingState.AUTO))
    .setProps(
      {validValues:
        [Characteristic.TargetHeatingCoolingState.AUTO]
      });

  this.outdoorTempService
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', this.getTemperature.bind(this, 'outdoor', 'outdoor temp', false));
};

NefitEasyAccessory.prototype.getTemperature = function(type, prop, skipOutdoor, callback) {
  this.log.debug('Getting %s temperature...', type);

  this.client.connect().then(() => {
    return this.client.status(skipOutdoor);
  }).then((status) => {
    var temp = status[prop];
    if (!isNaN(temp) && isFinite(temp)) {
      this.log.debug('...%s temperature is %s', type, temp);
      return callback(null, temp);
    }
    else {
      // Return previous value if the device returns NaN.
      if (prop == 'in house temp') {
        temp = this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature).value;
      }
      else if (prop == 'outdoor temp') {
        temp = this.outdoorTempService.getCharacteristic(Characteristic.CurrentTemperature).value;
      }
      else {
        temp = this.thermostatService.getCharacteristic(Characteristic.TargetTemperature).value;
      }
      return callback(null, temp);
    }
  }).catch((e) => {
    console.error(e);
    return callback(e);
  });
};

NefitEasyAccessory.prototype.setTemperature = function(temp, callback) {
  // Round off to nearest half/full.
  temp = Math.round(temp * 2) / 2;

  this.log.info('Setting temperature to %s', temp);
  this.client.connect().then(() => {
    return this.client.setTemperature(temp);
  }).then(() => {
    return callback();
  }).catch((e) => {
    return callback(e);
  });
};

NefitEasyAccessory.prototype.getCurrentState = function(callback) {
  this.log.debug('Getting current state..');

  this.client.connect().then(() => {
    return this.client.status();
  }).then((status) => {
    var state     = status['boiler indicator'];
    var isHeating = state === 'central heating';
    this.log.debug('...current state is', state);
    return callback(null,
      isHeating ? Characteristic.CurrentHeatingCoolingState.HEAT :
                  Characteristic.CurrentHeatingCoolingState.OFF
    );
  }).catch((e) => {
    console.error(e);
    return callback(e);
  });
};

NefitEasyAccessory.prototype.getServices = function() {
  const informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, 'Nefit')
        .setCharacteristic(Characteristic.Model, 'Easy')
        .setCharacteristic(Characteristic.SerialNumber, this.serialNumber);

  return [informationService, this.thermostatService, this.outdoorTempService];
};
