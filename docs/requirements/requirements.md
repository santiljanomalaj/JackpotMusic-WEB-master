# Requirements

The following are the requirements for the development of Jackpot Music Game

## Node.js and NPM

These are needed for the runtime environment and the management of the packages respectively.

**Supported versions are:**

| Node.js      | NPM         |
| :---------:  | :---------: |
| `^10.16.1`   | `^6.11.3`   |

**Installation:**

Download and install the executable in [Node.js](https://nodejs.org/en/) page.

## Angular

This package is the Command Line Interface (CLI) for Angular Framework
[Angular](https://angular.io/docs)

**Supported versions are:**

`^8.1.3`

**Installation:**

Execute in your machine terminal

*Windows:*

``` shell
npm install --global @angular/cli
```

*Mac OS / Linux:*

``` shell
sudo npm install --global @angular/cli
```

## MongoDB

If you haven't install MongoDB on your local machine yet...

`brew update`

`brew install mongodb`

(more info [here](https://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/))

### Create local MongoDB database ([more info](https://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/#create-the-data-directory))

1. `mkdir <where you want to store your mongo database>`
2. `cd <your new mongo folder>`
3. `mkdir -p ./data/db`

### Run MongoDB Locally ([more info](https://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/#specify-the-path-of-the-data-directory))

`mongod --dbpath ~/<your mongo folder>/data/db`
