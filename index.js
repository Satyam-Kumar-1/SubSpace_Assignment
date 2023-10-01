const http = require('http');
const express = require('express');
const app = express();
const port = 8000;

const _ = require('lodash');

let data;
let responseObject;

// Middleware for handling errors
function errorHandler(err, req, res, next) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
}

const options = {
    method: 'GET',
    headers: {
        'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6'
    }
};

// Create a memoization function for fetching and processing data
const fetchData = _.memoize(() => {
    console.log('Fetching data...'); // Log when data is fetched
    return fetch('https://intent-kit-16.hasura.app/api/rest/blogs', options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Fetch failed with status ${response.status}`);
            }
            return response.json();
        })
        .then((fetchedData) => {
            data = fetchedData.blogs;

            const totalBlogs = data.length;

            const blogWithLongestTitle = _.maxBy(data, (blog) => blog.title.length);

            const blogsWithPrivacy = _.filter(data, (blog) => {
                const title = blog.title || '';
                return _.includes(title.toLowerCase(), 'privacy');
            });

            const uniqueBlogTitles = _.uniqBy(data, 'title').map((blog) => blog.title);

            // Build the responseObject
            responseObject = {
                totalBlogs,
                longestBlogTitle: blogWithLongestTitle.title,
                blogsWithTitlePrivacy: blogsWithPrivacy.length,
                uniqueBlogTitles,
            };

            return responseObject;
        })
        .catch(err => {
            console.error(err);
            throw err;
        });
});

// Define routes that use data and responseObject

app.get('/', async (req, res) => {
    try {
        
        const cachedResponse = await fetchData();
     
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(cachedResponse, null, 2));
    } catch (err) {
        res.status(500).json({ error: 'Data not available yet' });
    }
});



app.get('/api/blog-search',async (req, res) => {
    try {
        await fetchData();
        const query = req.query.query || '';
        const matchingBlogs = data.filter((blog) => {
            const title = blog.title || '';
            return title.toLowerCase().includes(query.toLowerCase());
        });
        const searchResult = {
            query,
            numberOfResults: matchingBlogs.length,
            matchingBlogs,
        };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(searchResult, null, 2));
    } catch (err) {
        res.status(500).json({ error: 'Data not available yet' });
    }
});

app.use(errorHandler);

// Start the server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
