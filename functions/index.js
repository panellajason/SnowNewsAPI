const functions = require('firebase-functions');
const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')

const app = express()
const resorts = []

// Removes duplicate or null articles
function getFilteredArticles(articles) {
    const nonNullObjects = articles.filter(article => article !== null && article !== undefined);
    return nonNullObjects.filter((object, index, self) => index === self.findIndex((o) => o.title === object.title)); 
}

// Returns OpenSnow articles
function getOpenSnowArticle($, cheerioElement, title, url) {
    const description = cheerioElement.children().find('h3').text().replace('\n', '').trim();
    if (description !== '') {
        title = title + ': ' + description
    }

    cheerioElement.children().find('span').each(function() {
        const spanText = $(this).text()
        if (!spanText) {
            return
        }
        if (
            spanText.includes('hour') || 
            spanText.includes('minute') || 
            spanText.includes('day') || 
            spanText.includes('week') |
            spanText.includes('month')
        ) {
            const timeAgo = spanText.replace('\n', '').trim()
            title = title + ' (' + timeAgo + ')'
        }
    })

    return {
        title, url, source: "Open Snow"
    }
}

// Returns Powderchasers article
function getPowderchasersArticle($, cheerioElement) {
    const url = $(cheerioElement).find('a').attr('href')
    if (!url) {
        return;
    }
    if (!url.includes('/blogs/powderchasers-forecasts/')) {
        return
    }

    const title = $(cheerioElement).find('h2').text().trim()
    return {
        title, url: "https://powderchasers.com" + url, source: "Powderchasers"
    };
}

// Gets forecast for resorts on OpenSnow
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
    axios.get('https://opensnow.com/dailysnow').then(response => {
        const html = response.data;
        const $ = cheerio.load(html);

        $('ul li, ol li').each(function() {
            const url = $(this).find('a').attr('href')
            if (!url) {
                return
            }
            if (url.includes("mammoth")) {
                articles.push(getOpenSnowArticle($, $(this), "Mammoth", url));
            }
            if (url.includes("tahoe") && !(url.includes("palisades"))) {
                articles.push(getOpenSnowArticle($, $(this), "Tahoe", url));
            }
            if (url.includes("southerncalifornia")) {
                articles.push(getOpenSnowArticle($, $(this), "Southern California", url));
            }
        })

        // Snow Brains
        axios.get('https://snowbrains.com/category/weather').then(response => {
            const html = response.data;
            const $ = cheerio.load(html);

            $('article').each(function() {
                const title = $(this).find('h2').text().trim()
                const url = $(this).find('a').attr('href')
                articles.push({
                    title, url, source: "Snow Brains"
                })
            })

            // Powderchasers
            axios.get('https://powderchasers.com/blogs/powderchasers-forecasts').then(response => {
                const html = response.data;
                const $ = cheerio.load(html);
                
                $('.article-item').each( function() {
                    articles.push(getPowderchasersArticle($, $(this)));
                });

                // Returns all articles for the API
                res.json(getFilteredArticles(articles))
            }).catch(error => {
                console.log(error);
                res.json(getFilteredArticles(articles))
            });
        }).catch(error => {
            console.log(error);
            res.json(getFilteredArticles(articles))
        });
    }).catch(error => {
        console.log(error);
        res.json(getFilteredArticles(articles))
    });
});

// 5 day Snowfall Forecast
app.get('/forecast', (req, res) => {
    // Socal resorts
    axios.get('https://opensnow.com/dailysnow/southerncalifornia').then((websiteResponse) => {
        const html = websiteResponse.data
        const $ = cheerio.load(html)
        $('.resort').each(function() {
            getResortsForecast($, $(this))
        })

        // Mammoth resorts
        axios.get('https://opensnow.com/dailysnow/mammoth').then((websiteResponse) => {
            const html = websiteResponse.data
            const $ = cheerio.load(html)
            $('.resort').each(function() {
                getResortsForecast($, $(this))
            })

            res.json(resorts)
        }).catch(error => {
            console.log(error);
            res.json(resorts)
        });
    }).catch(error => {
        console.log(error);
        res.json(resorts)
    });
})

exports.app = functions.https.onRequest(app)