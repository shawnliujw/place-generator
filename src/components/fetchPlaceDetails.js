/**
 *  used for stores scraped from google
 */
const http = require('request-promise');
const logger = require('log4js').getLogger('src/components/fetchPlaceDetails.js');
const Promise = require('bluebird');
const apiURL = require('./googleServerURL');

async function getDetails(placeId, locale) {
    const {cache, config} = global;
    if (!placeId) {
        return Promise.reject({
            errorMessage: 'placeId is required to get place details'
        });
    }
    const query = {
        placeid: placeId,
        key: config.googleAPIKey,
        language: locale ? locale.substr(0, 2) : 'en'
    };

    const cacheKey = `details_${placeId}_${query.language}`;
    const cacheData = await cache.getItem(cacheKey);
    if (cacheData && cacheData !== {}) {
        logger.info(`Using details cache: ${placeId}`);
        return cacheData;
    }
    logger.info(`Fetching details: ${placeId}`);
    const scraped = await http.get(apiURL.details(),
        {
            qs: query
        })
        .then(JSON.parse);
    logger.info(`Fetched details: `, scraped);
    if (scraped && scraped.error_message) {
        throw new Error(scraped.error_message);
    } else if (!scraped) {
        throw new Error('Got no response from google API');
    }
        await cache.setItem(cacheKey, scraped);
    return scraped;
}

module.exports = async (placeId, locale, retryTimes) => {
    const times = retryTimes || 2;
    let error = null;
    for (let i = 0; i < times; i++) {
        try {
            return await getDetails(placeId, locale);
        } catch (e) {
            logger.error(e);
            if (e && e.statusCode === 400) {
                error = {
                    message: JSON.parse(e.response.body).error_message
                }
            } else {
                error = e;
            }
            await Promise.delay(Math.random() * 100);
        }
    }
    throw error;
};