# databox-driver-twitter-stream
A Databox driver to stream data from twitter

# Status

This is work in progress.

# Authentication

overwrite twitter-secrets.json with the consumer_key and consumer_secret. When running within the databox OAuth is then used to finally authenticate the user with twitter. This is accessed by visiting /ui/databox-driver-twitter-stream/.


# Data stored
This driver writes twitter event data into a databox-store-blob for later processing.

It saves the following streams of data:

    1. twitterUserTimeLine - the logged in users timeline
    2. twitterHashTagStream - tweets that contain #raspberrypi, #mozfest, #databox, #iot and #NobelPrize
    3. twitterDirectMessage - a list of the users' direct messages 
    4. twittrRetweet - a list of the users' retweets 
    5. twitterFavorite - a list of the users favourited

These can then be accessed databox-store-blob API.
