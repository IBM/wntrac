#  WNTRAC Data browser

## Prerequisites

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 7.3.0. If you have this Angular version installed, you can jump to [getting started](#getting-started).

Ensure you have [Node.js](https://nodejs.org) and [npm package manager](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) installed with the node version above v8.11.3. Install angular version 7.3.0 by following instructions from [here](https://www.npmjs.com/package/@angular/cli) and/or [here](https://angular.io/guide/setup-local) 

## Getting started

After cloning the current repository, navigate to the databrowser section `cd code/databrowser` and follow the following steps to get started;
1. Run `npm install` to install all the required dependencies
2. Add your [mapbox access token](https://account.mapbox.com/) `"mapbox_api_key"` parameter in `environment.ts` and `environment.prod.ts`
3. Obtain COVID-19 outcome data (Confirmed cases, Deaths, Recoveries, Hospitalised & Testing) from the [WHO](https://covid19.who.int/table), and [ECDC](https://www.ecdc.europa.eu) sources, which were used to build the visualisation.
4. Structure the obtained data in to two json, one for the world countries and the other for US states. The two json should have the following structure;
```json
{
  "c_data": {
    "DZ": {
      "Lat": 28.033886,
      "Long": 1.6596259999999998,
      "Country/Region": "Algeria",
      "Province/State": "",
      "code": "DZ",
      "data": {
        "1601586000000.0": 51847,
        "1601672400000.0": 51995
      },
      "non_zero_data": {
        "216": {
          "date": 1601586000000.0,
          "value": 51847
        },
        "217": {
          "date": 1601672400000.0,
          "value": 51995
        }
      }
    }
  },
  "d_data": {
    "Tennessee": {
      "Country/Region": "US",
      "Province/State": "Tennessee",
      "data": {
        "1601758800000.0": 2560
      },
      "non_zero_data": {
        "1": {
          "date": 1601758800000.0,
          "value": 2560
        }
      }
    }
  },
  "r_data": {
    
  },
  "t_data": {
    
  },
  "h_data": {
    
  }
}
```
Save the two json you created above in the following files, `/src/assets/data/outcome/world.json` for world data nd `/src/assets/data/outcome/us.json` for US states data.

## Development server

Run `npm run start` for a dev server. Navigate to `http://localhost:4200/`.
The app will automatically reload if you change any of the source files.


## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.


## Running lint

Run `npm run lint` to execute the lint scan


## Running unit tests

Run `npm run test` to execute the unit tests via [Karma](https://karma-runner.github.io).


## Running end-to-end tests

Run `npm run e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

## NOTE
We customized the plotly js to support additional icons. This holds well with version 1.53.0
In the event that ```"plotly.js-basic-dist": "^1.53.0"``` is updated from version 1.53.0, the file /scripts/custom_plotly.js will have to be updated for forward compatibility.
