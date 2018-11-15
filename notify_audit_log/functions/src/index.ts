import * as functions from "firebase-functions";
import * as Slack from "typed-slack";

const url = functions.config().slack.webhook_url;
const webhook = new Slack.IncomingWebhook(url);

export const alertAuditLog = functions.pubsub
  .topic("logging-resource-audit")
  .onPublish(message => {
    if (!message.data) {
      return "";
    }

    const messageJson = JSON.parse(
      Buffer.from(message.data, "base64").toString()
    );
    const options = {
      username: "Notify Audit Log",
      text: "audit log",
      attachments: [
        {
          color: "danger",
          fields: [
            {
              title: "user",
              value: messageJson.protoPayload.authenticationInfo.principalEmail,
              short: false
            },
            {
              title: "granted",
              value: messageJson.protoPayload.authorizationInfo[0].granted,
              short: true
            },
            {
              title: "permission",
              value: messageJson.protoPayload.authorizationInfo[0].permission,
              short: true
            },
            {
              title: "request IP Address",
              value: messageJson.protoPayload.requestMetadata.callerIp,
              short: true
            },
            {
              title: "UserAgent",
              value:
                messageJson.protoPayload.requestMetadata
                  .callerSuppliedUserAgent,
              short: true
            }
          ]
        }
      ]
    } as Slack.IncomingWebhookOptions;

    webhook.send(options);
    return "";
  });
