const NefitEasyClient = require('nefit-easy-commands');
var Service, Characteristic;

module.exports = function(homebridge) {
  Service        = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-nefit-easy', 'NefitEasy', NefitEasyAccessory);
  homebridge.registerAccessory('homebridge-nefit-easy', 'NefitEasyOutdoorTemp', NefitEasyAccessoryOutdoorTemp);
};

const nefitEasyServices = function() {
  const informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, 'Nefit')
        .setCharacteristic(Characteristic.Model, 'Easy')
        .setCharacteristic(Characteristic.SerialNumber, this.serialNumber);

  return [informationService, this.service];
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

  this.service = new Service.Thermostat(this.name);
  this.client  = NefitEasyClient(creds);

  // Establish connection with device.
  this.client.connect().catch((e) => {
    throw error(e);
  });

  this.service
    .getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', (callback) => callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS))
    .setProps({validValues: [Characteristic.TemperatureDisplayUnits.CELSIUS]});;

  this.service
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', this.getTemperature.bind(this, 'current', 'in house temp', true));

  this.service
    .getCharacteristic(Characteristic.TargetTemperature)
    .on('get', this.getTemperature.bind(this, 'target', 'temp setpoint', true))
    .on('set', this.setTemperature.bind(this))
    .setProps({minValue: 5, maxValue: 30, minStep: 0.5});

  this.service
    .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', this.getCurrentState.bind(this))
    .setProps(
      {validValues: [Characteristic.CurrentHeatingCoolingState.OFF,
                     Characteristic.CurrentHeatingCoolingState.HEAT]
      });

  this.service
    .getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('get', (callback) => callback(null, Characteristic.TargetHeatingCoolingState.AUTO))
    .setProps({validValues: [Characteristic.TargetHeatingCoolingState.AUTO]});
};

const nefitEasyGetTemp = function(type, prop, skipOutdoor, callback) {
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
      this.log.debug('Request for temperature resulted in invalid value: %s', temp);

      // Try one more time, this almost always results in a valid value.
      this.client.status(skipOutdoor).then((newStatus) => {
        var newTemp = newStatus[prop];
        if (!isNaN(newTemp) && isFinite(newTemp)) {
          this.log.debug("Retry request for temperature resulted in valid value: %s", newTemp);
          return callback(null, newTemp);
        }
        else {
          this.log.debug("Retry request for temperature resulted in invalid value again: %s", newTemp);

          // Return last known value, needed to keep service responsive for Siri.
          if (prop == 'in house temp' || prop == 'outdoor temp') {
            return callback(null, this.service.getCharacteristic(Characteristic.CurrentTemperature).value);
          }
          else if (prop == 'temp setpoint') {
            return callback(null, this.service.getCharacteristic(Characteristic.TargetTemperature).value);
          }
        }
      });
    }
  }).catch((e) => {
    console.error(e);
    return callback(e);
  });
};

NefitEasyAccessory.prototype.getTemperature = nefitEasyGetTemp;

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

NefitEasyAccessory.prototype.getServices = nefitEasyServices;

function NefitEasyAccessoryOutdoorTemp(log, config) {
  this.log     = log;
  this.name    = config.name;

  // Make sure that the credentials are there.
  var creds = config.options || config.authentication;
  if (! creds || typeof creds.serialNumber !== 'string' ||
      typeof creds.accessKey !== 'string' || typeof creds.password !== 'string') {
    throw Error('[homebridge-nefit-easy] Invalid/missing credentials in configuration file.');
  }

  this.serialNumber = creds.serialNumber;

  this.service = new Service.TemperatureSensor(this.name);
  this.client  = NefitEasyClient(creds);

  // Establish connection with device.
  this.client.connect().catch((e) => {
    throw error(e);
  });

  this.service
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', this.getTemperature.bind(this, 'outdoor', 'outdoor temp', false));
};

NefitEasyAccessoryOutdoorTemp.prototype.getTemperature = nefitEasyGetTemp;

NefitEasyAccessoryOutdoorTemp.prototype.getServices = nefitEasyServices;
