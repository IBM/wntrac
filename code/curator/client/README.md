# WNTRAC Angular
This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.3.3. If you are using docker to build curator app you don't have to follow instructions in this file.

## Installing requirements
`npm install -g @angular/cli`

`npm update`

## Development server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

To deploy on gh-pages
```
ng add angular-cli-ghpages
ng deploy --repo=git@github.com:<github_name>/wntrac.git  --base-href /<github_name>/wntrac/
```

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Notes for developer

- Root path for apis located in `./src/app/api.service.ts`
- Components and css use [Angular Material](https://material.angular.io/components/categories)


## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
