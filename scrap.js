const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const fs = require('fs');
const { performance } = require('perf_hooks');
const path = require('path');
const app = express();

// Regular expression to extract email patterns
function extractEmails(text) {
  const emailRegex = /[\w.-]+@[^\s]+/g;
  return text.match(emailRegex) || [];
}

// Function to get response from the Gemini API
const getGeminiResponse = async (dom) => {
  const body = {
    contents: [
      {
        parts: [
          {
            text: `YOU ARE THE WORLD'S BEST EXPERT IN EXTRACTING SPECIFIC ELEMENT INFORMATION FROM THE DOM OF A WEBSITE. YOUR TASK IS TO METICULOUSLY PARSE THE PROVIDED DOM TO EXTRACT THE CLASS OR ID OF THE COMMENT (INPUT) ELEMENT AND PRESENT IT IN A WELL-DEFINED JSON FORMAT SUITABLE FOR FURTHER MANIPULATIONS WITHIN A CODEBASE.

            INSTRUCTIONS
            - ALWAYS ANSWER TO THE USER IN THE MAIN LANGUAGE OF THEIR MESSAGE.
            - YOU MUST PARSE THE PROVIDED DOM TO IDENTIFY THE COMMENT (INPUT) ELEMENT AND EXTRACT ITS CLASS OR ID.
            - OUTPUT THE EXTRACTED DATA IN A WELL-DEFINED JSON FORMAT.
             
            Chain of Thoughts
            Follow the instructions in the strict order:
            1. Understanding User Requirements:
               1.1. Carefully read and understand the specific element (comment input) specified by the user.
               1.2. Ensure clarity on the exact information required (class or ID).
             
            2. Parsing the DOM:
               2.1. Analyze the provided DOM structure.
               2.2. Identify and locate HTML elements and attributes that represent the comment (input) element.
             
            3. Extracting Information:
               3.1. Extract the class or ID of the comment (input) element, ensuring validity and correctness.
             
            4. Formatting Output:
               4.1. Organize the extracted data into a JSON format.
               4.2. Ensure the JSON structure is clear, accurate, and suitable for further manipulations within a codebase.
             
            5. Final Validation:
               5.1. Review the JSON output for completeness and accuracy.
               5.2. Ensure all requested information is included and correctly formatted.
             
            Example JSON Output Format
            {
              "comment_input": {
                "class": "comment-input-class",
                "id": "comment-input-id"
              }
            }
             
            What Not To Do
             
            OBEY and never do:
             
            NEVER IGNORE USER-SPECIFIED ATTRIBUTES.
            NEVER PROVIDE INCOMPLETE OR INACCURATE INFORMATION.
            NEVER OUTPUT DATA IN A FORMAT OTHER THAN JSON.
            NEVER OMIT VALIDATION OF EXTRACTED INFORMATION.
            NEVER FAIL TO ENSURE THE JSON STRUCTURE IS SUITABLE FOR CODEBASE MANIPULATIONS.
             
            the dom of the website is: ${dom}
            `,
          },
        ],
      },
    ],
  };

  const response = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyAOZU5wksoj43gcqc2EvIR8BPMD0gqMkDc',
    body
  );

  return response.data;
};

const getScrapingdata = async (url) => {
  try {
    const startTime = performance.now();
    const { data } = await axios.get(url);
    const endTime = performance.now();
    const time = `${Math.round(endTime - startTime)} ms`;
    const $ = cheerio.load(data);
    const emails = [];
    $('body')
      .find('*')
      .each((index, element) => {
        const text = $(element).text();
        const extractedEmails = extractEmails(text);
        emails.push(...extractedEmails);
      });

    // Extract the DOM as text
    const dom = $.html();
    const geminiResponse = await getGeminiResponse(dom);

    // Extract the response and parse it to JSON
    const geminiResponsesText =
      geminiResponse.candidates[0].content.parts[0].text;

    // Remove unnecessary backticks and newlines
    const cleanedText = geminiResponsesText
      .replace(/```json\n/g, '')
      .replace(/\n```/g, '');

    let geminiResponses;
    try {
      geminiResponses = JSON.parse(cleanedText);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      geminiResponses = geminiResponsesText;
    }

    return { geminiResponses, time };
  } catch (error) {
    console.error('Error:', error);
    return { url, error };
  }
};

// Route to scrape data from the URL and return the results
app.get('/scrape', async (req, res) => {
  try {
    const urls = ['https://www.quora.com/'];
    const scrapingResults = await Promise.all(
      urls.map((url) => getScrapingdata(url))
    );

    const results = scrapingResults.map(({ geminiResponses, time }) => ({
      geminiResponses,
      time,
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
