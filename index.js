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

  this.service = new Service.Thermostat(this.name);
  this.client  = NefitEasyClient(creds);

  this.service
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', (callback) => callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS));

  this.service
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', this.getTemperature.bind(this, 'current', 'in house temp'));

  this.service
    .getCharacteristic(Characteristic.TargetTemperature)
    .on('get', this.getTemperature.bind(this, 'target', 'temp setpoint'))
    .on('set', this.setTemperature.bind(this));

  this.service
    .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', this.getCurrentState.bind(this));
};

NefitEasyAccessory.prototype.getTemperature = function(type, prop, callback) {
  this.log.debug('Getting %s temperature...', type);

  this.client.connect().then(() => {
    return this.client.status(true);
  }).then((status) => {
    var temp = status[prop];
    if (!isNaN(temp) && isFinite(temp)) {
      this.log.debug('...%s temperature is %s', type, temp);
      return callback(null, temp);
    }
    else {
      return callback(new Error("Device returned NaN as temperature value."));
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
        .setCharacteristic(Characteristic.SerialNumber, this.serialNumber)
  
  return [informationService, this.service];
};
