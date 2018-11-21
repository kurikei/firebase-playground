import * as functions from "firebase-functions";
import {bigquery_v2} from "googleapis";
import Schema$JobConfigurationLoad = bigquery_v2.Schema$JobConfigurationLoad;
const { BigQuery } = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');

const bigquery = new BigQuery();
const dataset = bigquery.dataset('firestore')
const storage = new Storage();
const triggerBucket = functions.config().bucket.firestore_export

exports.loadFirestoreBackupToBq = functions.storage.bucket(triggerBucket).object().onFinalize((objectMetadata) => {
    if (!objectMetadata.name.match(/\.export_metadata$/i)) {
        console.log("not target file. filename: " + objectMetadata.name)
        return Promise.resolve("not target file")
    }

    const [, kind] = objectMetadata.name.match(/_kind_(.*?).export_metadata$/i) || [, ""]
    if (!kind) {
        console.error("cannot find kind name. filename: " + objectMetadata.name)
        return Promise.reject("cannot find kind name")
    }

    const table = dataset.table(kind)
    table.exists().then( (data) => {
        const exists = data[0]
        if (!exists) {
            table.create().then((err)=>{
                if (err) {
                    return Promise.reject("failed to create table")
                }
                return Promise.resolve("success to create table")
            })
        }
        return Promise.resolve("assert existing table")
    }).catch((reason) =>{
        console.error(reason)
        return Promise.reject("failed to create table")
    })

    const metadata = { sourceFormat: "DATASTORE_BACKUP"} as Schema$JobConfigurationLoad
    table.createLoadJob(storage.bucket(objectMetadata.bucket).file(objectMetadata.name), metadata).then((data) => {
        console.log(data)
    })

    return Promise.resolve("success to request load")
})
