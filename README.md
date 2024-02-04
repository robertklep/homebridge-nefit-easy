# DEPRECATED

Since I stopped using Homebridge many years ago, and also haven't had a Nefit Easy for more than 4 years, this plugin is deprecated. It may still work for you, or it may not, but I cannot provide support for it.

# Homebridge Nefit Easy™ plugin

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge) to allow controlling your Nefit Easy™ (aka Worcester Wave™, Junkers Control™) thermostat through iOS' HomeKit.

Uses the [`nefit-easy-commands`](https://github.com/robertklep/nefit-easy-commands) module under the hood to communicate with the Nefit/Bosch backend.

## Installation

_This library requires Node.js 6.0.0 or later!_

```
$ npm i homebridge-nefit-easy -g
```

Homebridge plugins need to be installed globally, so the `-g` is mandatory.

## Problems on recent Linux distributions

If you're having problems getting any data from the HTTP server, and you're using a recent Linux distribution (for instance, Raspbian Buster), take a look at [this comment](https://github.com/robertklep/nefit-easy-http-server/issues/35#issuecomment-510818042).

In short: OpenSSL defaults have changed to require a minimum TLS version and cipher implementation. These defaults cause the Nefit client code to not be able to connect to the Nefit/Bosch backend.

The solution is mentioned [here](https://www.debian.org/releases/stable/amd64/release-notes/ch-information.en.html#openssl-defaults): edit the file `/etc/ssl/openssl.cnf` and change the following keys to these values:
```
MinProtocol = None
CipherString = DEFAULT
```

## Configuration

### Thermostat

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

### Outdoor temperature

To also use the outdoor temperature measured by the Nefit Easy device, add a `NefitEasyOutdoorTemp` accessory to `~/.homebridge/config.json`:

```
"accessories": [
    ...
    {
        "accessory" : "NefitEasyOutdoorTemp",
        "name"      : "buitentemperatuur",
        "options"   : {
            "serialNumber" : "NEFIT_SERIAL_NUMBER",
            "accessKey"    : "NEFIT_ACCESS_KEY",
            "password"     : "NEFIT_PASSWORD"
        }
    }
]
```

*All credentials options should be set for both the `NefitEasy` and the `NefitEasyOutdoorTemp` device.*

## Supported actions

* Getting the current temperature
* Getting the target temperature
* Setting the target temperature
* Getting the outside temperature (optional)
