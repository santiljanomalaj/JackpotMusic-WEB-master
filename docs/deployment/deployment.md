# Deployment

This is a breve guide to create a build and deploy it.

## 1. Creating a build

You need to open a terminal in the root of the project and execute the following script:

_Windows_:

```shell script
npm run build:<environment>
```

_Mac OS / Linux_:

```shell script
sudo npm run build:<environment>
```

The available environments are: `staging` or `production`

## 2. Create a zip file

 Now in the project folder:

 Once the build process finished, create a zip the following folders and files:

  1. `dist` folder.
  1. `server` folder.
  1. `package.json` file.

## 3. Upload and Deploy

1. You must go to
[Elastic Beanstalk](https://console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1#/applications).
1. Enter into the aplication of the environment being deployed. &sup1;
1. Press `Upload and Deploy`.
1. Then, press `Choose file`.
1. Find and select the zip file previously created.
1. Then press `Open`.
1. Finally, press `Deploy`.

**Note:** Do not reload the page.

Once the process is done, the API will be working.

&sup1;:
(Currently only
[JackpotMusicApi-staging](https://console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1#/environment/dashboard?applicationName=jackpot-music-api&environmentId=e-cbzuhqh8gv)
is available)
