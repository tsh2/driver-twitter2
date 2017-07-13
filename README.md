# driver-twitter

A Databox driver to stream data from twitter. This driver supports twitter streaming API and uses app auth. 

Its provides an example of settings persistance and the use of datasources. It also has a test actuator. 


# Status

This is work in progress but getting better ;-).

# Authentication

If you wish to use this driver with your own twitter account then. 

     - Go to https://apps.twitter.com/ and log in 
     - Click create new app
     - Fill in the form (set website to http://127.0.0.1) agree to the T&C's 
     - Then go to the 'Keys and Access Tokens' tab
     - Click on "Create my access token"
     - Then in databox find the driver tab and click on the twitter driver
     - Copy and past Consumer Key, Consumer Secret, Access Token, Access Token Secret into the driver and click save. 

# Data stored
This driver writes twitter event data into a store-json for later processing.

It saves the following streams of data:

    1. twitterUserTimeLine - the logged in users timeline
    2. twitterHashTagStream - tweets that contain #raspberrypi, #mozfest, #databox, #iot and #NobelPrize
    3. twitterDirectMessage - a list of the users' direct messages 
    4. twittrRetweet - a list of the users' retweets 
    5. twitterFavorite - a list of the users favourited

These can then be accessed store-json API.
