# Usage

## Create and update .env

We are using .env to store our local environment variables. These are specific to each developer's machine and will get overwritten for each environment when uploading to staging / production on Heroku. More info about [dotenv here](https://github.com/motdotla/dotenv).

* Create your own `.env` file by duplicating the `.env.example` file ([more info here](#create-and-update-env))
* Make sure to create a random string for the `SESSION_SECRET` and `JWT_SECRET`
* Update your local database name to match the client name (or whatever, doesn't really matter since this is only on your machine)
* You can wait on the other variables until you need the specific feature

## Start API Server

* Start the server with `npm start`
* Uses Nodemon to automatically restart server when changes are made
* Server runs on port 3000 locally: [http://localhost:3000](http://localhost:3000)

## Start Web Admin

* Start the server with `npm run serve:dev`
* Server runs on port 4200 locally: [http://localhost:4200](http://localhost:4200)

### Setup Admin User And Admin Portal

* Use the API to register a new user
* After you create the user, use [robomongo](https://robomongo.org) or command line to add `admin` to the user's roles array.
* Now you should be able to access the admin screens after logging in. Otherwise you will get a 403 error from the web API

## Troubleshooting

### Download Production Data

Sometimes it's beneficial to quickly bring your environment up to production standards rather than starting from scratch. We've put together a small script that can help with this effort.

`npm run load_prod_dump`

_This script assumes you have some production database environment variables set on your local machine. Check the script under in `bin/` for what is needed and place these into your `.env` environment file.
