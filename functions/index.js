// Export all Cloud Functions
const sendNotification = require('./sendNotification');

exports.sendPushNotification = sendNotification.sendPushNotification;
