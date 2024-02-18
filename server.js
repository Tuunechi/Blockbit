

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto')
const path =require('path')
require("dotenv").config()

const app = express();
const PORT = process.env.PORT || 5000;
const apiKey = process.env.MAILCHIMP_API_KEY
const listId = process.env.MAILCHIMP_LIST_ID

// Middleware for parsing request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



// for feeding the statics files 

app.use(express.static(path.join(__dirname + "/public")))


//define a file handler for all the GET requests 

app.get('*', (req, res)=>{
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
});

// Route for handling subscription requests
app.post("/subscribe", async (req, res) => {
    const { email } = req.body;

    // Construct the data payload for the Mailchimp API request
    const data = {
        email_address: email,
        status: 'subscribed'
    };

    try {
        // Make a POST request to the Mailchimp API
        const response = await axios.post(
            `https://us9.api.mailchimp.com/3.0/lists/${listId}/members`,
            data,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `apikey ${apiKey}`
                }
            }
        );

        // Handle successful response from Mailchimp API
        console.log(response.data);
        res.status(200).send('Successfully subscribed!');
    } catch (error) {
        // Handle errors
        console.error('Error subscribing to newsletter:', error.response.data);
        console.log(error)
        
        // Check if the error is due to the user already being a member
        if (error.response && error.response.status === 400 && error.response.data.title === 'Member Exists') {
            // User is already a member, use PUT to update
            const subscriberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
            try {
                const updateResponse = await axios.put(
                    `https://us9.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`,
                    data,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `apikey ${apiKey}`
                        }
                    }
                );
                console.log('Successfully updated existing member:', updateResponse.data);
                res.status(200).send('User already a member, successfully updated');
            } catch (updateError) {
                console.error('Error updating existing member:', updateError);
                res.status(500).send('Error updating existing member');
            }
        } else {
            res.status(500).send('Error subscribing to newsletter');
        }}
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

