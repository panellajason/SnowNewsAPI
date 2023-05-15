const functions = require('firebase-functions');
const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')

const app = express()
const resorts = []

// Get attributes for open snow articles
function getAttrsAndPushOpenSnowArticle($, cheerioElement, title) {
    const description = cheerioElement.children().find('h3').text().replace('\n', '').trim();
    if (description !== '') {
        title = title + ': ' + description
    }

    cheerioElement.children().find('span').each(function() {
        const spanText = $(this).text()
        if (spanText.includes('hour') || spanText.includes('minute') || spanText.includes('day') || spanText.includes('week')) {
            const timeAgo = spanText.replace('\n', '').trim()
            title = title + ' (' + timeAgo + ')'
        }
    })

    return title;
}

// Gets forecast for resorts
function getResortsForecast($, cheerioElement) {
    let resort = cheerioElement.children('.name').text()
    let fiveDaySnowTotal = cheerioElement.children('.snowfall.ml-auto').text().replace(/[^\d.-]/g, '')
    let url = cheerioElement.children('a').attr('href')

    resorts.push({
        resort, fiveDaySnowTotal, url: 'https://opensnow.com' + url
    })
}

// Home Page
app.get('/', (req, res) => {
    res.json("Welcome to snow news")
})

// All News
app.get('/allnews', (req, res) => {
    const articles = []

    // Open Snow
    axios.get('https://opensnow.com/dailysnow')
        .then(response => {
            const html = response.data;
            const $ = cheerio.load(html);
            $('a').each(function() {
                const url = $(this).attr('href').toString()
                if (url.includes("mammoth")) {
                    const title = getAttrsAndPushOpenSnowArticle($, $(this), "Mammoth")
                    articles.push({
                        title, url, source: "Open Snow"
                    })
                }
                if (url.includes("tahoe") && !(url.includes("palisades"))) {
                    const title = getAttrsAndPushOpenSnowArticle($, $(this), "Tahoe")
                    articles.push({
                        title, url, source: "Open Snow"
                    })
                }
                if (url.includes("southerncalifornia")) {
                    const title = getAttrsAndPushOpenSnowArticle($, $(this), "Southern California")
                    articles.push({
                        title, url, source: "Open Snow"
                    })
                }
            })
        }).catch(error => {
        console.log(error);
        res.json(articles)
    }).then(() => {
        // Snow Brains
        axios.get('https://snowbrains.com/category/weather')
            .then(response => {
                const html = response.data;
                const $ = cheerio.load(html);

                $('article').each( function() {
                    const title = $(this).find('h2').text().trim()
                    const url = $(this).find('a').attr('href')
                    articles.push({
                        title, url, source: "Snow Brains"
                    })
                })
                res.json(articles)
            }).catch(error => {
            console.log(error);
            res.json(articles)
        });
    })
})

//5 day Snowfall Forecast
app.get('/forecast', (req, res) => {
    axios.get('https://opensnow.com/dailysnow/southerncalifornia').then((websiteResponse) => {
        const html = websiteResponse.data
        const $ = cheerio.load(html)

        $('.resort').each(function() {
            getResortsForecast($, $(this))
        })

        axios.get('https://opensnow.com/dailysnow/mammoth').then((websiteResponse) => {
            const html = websiteResponse.data
            const $ = cheerio.load(html)
            $('.resort').each(function() {
                getResortsForecast($, $(this))
            })

            res.json(resorts)
        })
    })
})

exports.app = functions.https.onRequest(app)