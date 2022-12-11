const functions = require('firebase-functions');
const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')

const app = express()

//News Sources
const websites = [
    {
        name: 'Open Snow',
        address: 'https://opensnow.com/dailysnow',
        base: 'https://opensnow.com'
    },
    {
        name: 'Snow Brains',
        address: 'https://snowbrains.com/category/weather',
        base: ''
    }, 
    {
        name: 'Powder Chasers',
        address: 'https://powderchasers.com/forecasts',
        base: 'https://powderchasers.com'
    }
]

//Home Page
app.get('/', (req, res) => {
    res.json("Welcome to snow news")
})

//All News
app.get('/allnews', (req, res) => {
    let i = 0
    const articles = []

    websites.forEach(newspaper => {

        axios.get(newspaper.address).then((websiteResponse) => {
            const html = websiteResponse.data
            const $ = cheerio.load(html)
    
            title = ''
            url = ''
            i++

            if(newspaper.name == 'Snow Brains') {
    
                $('article').each( function() {
                    
                    title = $(this).find('h2').text().trim()
                    url = $(this).find('a').attr('href')
                    articles.push({
                        title, url: newspaper.base + url, source: newspaper.name
                    })
                })

            } else if(newspaper.name == 'Powder Chasers') {
        
                $('article').each( function() {
                    
                    title = $(this).find('b').text().trim()
                    url = $(this).children('a').attr('href')
                    articles.push({
                        title, url: newspaper.base + url, source: newspaper.name
                    })
                })
            } else if(newspaper.name == 'Open Snow') {

                $('a').each(function() {
                    url = $(this).attr('href').toString()

                    if (url.includes("mammoth")) {
                        title = 'Mammoth'
                        description = $(this).children().find('h3').text().replace('\n', '').trim()
                        if (description != '') {
                            title = title + ': ' + description
                        }

                        $(this).children().find('span').each(function() {
                            if ($(this).text().includes('hours')) {
                                timeAgo = $(this).text().replace('\n', '').trim()
                                if (timeAgo != '') {
                                    title = title + ' (' + timeAgo + ')'
                                }
                            }
                        })

                        articles.push({
                            title: title, url: url, source: newspaper.name
                        }) 
                    }

                    if (url.includes("tahoe") && !(url.includes("palisades"))) {
                        title = 'Tahoe'
                        description = $(this).children().find('h3').text().replace('\n', '').trim()
                        if (description != '') {
                            title = title + ': ' + description
                        }

                        $(this).children().find('span').each(function() {
                            if ($(this).text().includes('hours')) {
                                timeAgo = $(this).text().replace('\n', '').trim()
                                if (timeAgo != '') {
                                    title = title + ' (' + timeAgo + ')'
                                }
                            }
                        })

                        articles.push({
                            title: title, url: url, source: newspaper.name
                        }) 
                    }

                    if (url.includes("southerncalifornia")) {
                        title = 'Southern California'
                        description = $(this).children().find('h3').text().replace('\n', '').trim()
                        if (description != '') {
                            title = title + ': ' + description
                        }

                        $(this).children().find('span').each(function() {
                            if ($(this).text().includes('hours')) {
                                timeAgo = $(this).text().replace('\n', '').trim()
                                if (timeAgo != '') {
                                    title = title + ' (' + timeAgo + ')'
                                }
                            }
                        })

                        articles.push({
                            title: title, url: url, source: newspaper.name
                        }) 
                    }
                })    
            }

            if (i === websites.length) {
                res.json(articles)
            }
        })
    })
})

//5 day Snowfall Forecast
app.get('/forecast', (req, res) => {
    const resorts = []

    axios.get('https://opensnow.com/dailysnow/southerncalifornia').then((websiteResponse) => {
        const html = websiteResponse.data
        const $ = cheerio.load(html)

        $('.resort').each(function() {
            resort = $(this).children('.name').text()
            fiveDaySnowTotal = $(this).children('.snowfall.ml-auto').text().replace(/[^\d.-]/g, '')
            url = $(this).children('a').attr('href')
            resorts.push({
                resort, fiveDaySnowTotal, url: 'https://opensnow.com' + url
            })              
        })

        axios.get('https://opensnow.com/dailysnow/mammoth').then((websiteResponse) => {
            const html = websiteResponse.data
            const $ = cheerio.load(html)

            $('.resort').each(function() {
                resort = $(this).children('.name').text()
                fiveDaySnowTotal = $(this).children('.snowfall.ml-auto').text().replace(/[^\d.-]/g, '')
                url = $(this).children('a').attr('href')
                resorts.push({
                    resort, fiveDaySnowTotal, url: 'https://opensnow.com' + url
                })              
            })

            res.json(resorts)
        })
    })
})

exports.app = functions.https.onRequest(app)