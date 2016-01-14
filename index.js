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
  this.service = new Service.Thermostat(this.name);
  this.client  = NefitEasyClient(config.authentication);

  this.service
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', (callback) => callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS));

  this.service
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', this.getTemperature.bind(this, 'current', 'in house temp'));

  this.service
    .getCharacteristic(Characteristic.TargetTemperature)
    .on('get', this.getTemperature.bind(this, 'target', 'temp override temp setpoint'))
    .on('set', this.setTemperature.bind(this));

  this.service
    .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', this.getCurrentState.bind(this));
};

NefitEasyAccessory.prototype.getTemperature = function(type, prop, callback) {
  this.log('Getting %s temperature...', type);

  this.client.connect().then(() => {
    return this.client.status();
  }).then((status) => {
    var temp = status[prop];
    this.log('...current temperature is', temp);
    return callback(null, temp);
  }).catch((e) => {
    console.error(e.stack);
    return callback(e);
  });
};

NefitEasyAccessory.prototype.setTemperature = function(temp, callback) {
  this.log('Setting temperature to %s', temp);
  this.client.connect().then(() => {
    return this.client.setTemperature(temp);
  }).then(() => {
    return callback();
  }).catch((e) => {
    return callback(e);
  });
};

NefitEasyAccessory.prototype.getCurrentState = function(callback) {
  this.log('Getting current state..');

  this.client.connect().then(() => {
    return this.client.status();
  }).then((status) => {
    var state     = status['boiler indicator'];
    var isHeating = state === 'central heating';
    this.log('...current state is', state);
    return callback(null,
      isHeating ? Characteristic.CurrentHeatingCoolingState.HEAT :
                  Characteristic.CurrentHeatingCoolingState.OFF
    );
  }).catch((e) => {
    console.error(e.stack);
    return callback(e);
  });
};

NefitEasyAccessory.prototype.getServices = function() {
  return [ this.service ];
};
