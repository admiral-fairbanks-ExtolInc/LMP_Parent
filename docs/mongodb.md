## MongoDB Related Info

### Install on pi/raspbian

1. Update and upgrade raspbian packages (this might be optional):
  ```
  sudo apt-get update
  sudo apt-get upgrade
  ```
2. Install MongoDB:
  Note that the following installs the 32-bit MongoDB binary which is limited to less than 2GB of data.
  It may make sense to keep only a certain amount of days of data on the pi's,
  and then push/pull the pi data periodically to a cloud environment for doing historical reporting and analysis.
  ```
  sudo apt-get install mongodb-server
  ```
3. Start and enable MongoDB as a service:
  ```
  sudo service mongodb enable
  sudo service mongodb start
  ```
4. Check active MongoDB ports:
  ```
  sudo lsof -i -P -n | grep mongod
  ```
5. Use the [mongo shell](https://docs.mongodb.com/manual/mongo/#introduction) to verify things are working as expected.
