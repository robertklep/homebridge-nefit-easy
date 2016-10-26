# Homebridge Nefit Easy™ plugin

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge) to allow controlling your Nefit Easy™ thermostat through iOS' HomeKit.

Uses the [`nefit-easy-commands`](https://github.com/robertklep/nefit-easy-commands) module under the hood to communicate with the Nefit backend.

## Installation

```
$ npm i homebridge-nefit-easy -g
```

Homebridge plugins need to be installed globally, so the `-g` is mandatory.

## Configuration

First, you need a working Homebridge installation.

Once you have that working, edit `~/.homebridge/config.json` and add a new accessory:

```
"accessories": [
    ...
    {
        "accessory" : "NefitEasy",
        "name"      : "thermostaat",
        "options"   : {
            "serialNumber" : "NEFIT_SERIAL_NUMBER",
            "accessKey"    : "NEFIT_ACCESS_KEY",
            "password"     : "NEFIT_PASSWORD"
        }
    }
]
```

* The `name` will be the identifier that you can use, for example, in Siri commands;
* Replace `NEFIT_*` with the correct values;
* Any additional options get passed to the [`nefit-easy-core` constructor](https://github.com/robertklep/nefit-easy-core#constructor).

## Supported actions

* Getting the current temperature
* Getting the target temperature
* Setting the target temperature
