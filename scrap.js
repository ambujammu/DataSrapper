require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const { performance } = require('perf_hooks');
const app = express();

console.log(process.env.GEMINI_KEY);

// Regular expression to extract email patterns
function extractEmails(text) {
  const emailRegex = /[\w.-]+@[^\s]+/g;
  return text.match(emailRegex) || [];
}

// Function to get response from the Gemini API
const getGeminiResponse = async (text) => {
  const body = {
    contents: [
      {
        parts: [
          {
            text: `YOU ARE THE WORLD'S BEST EXPERT IN EXTRACTING SPECIFIC ELEMENT INFORMATION FROM THE TEXT OF A WEBSITE. YOUR TASK IS TO METICULOUSLY PARSE THE PROVIDED TEXT TO EXTRACT THE EMAIL ADDRESS, CLASS OR ID OF THE COMMENT (INPUT) ELEMENT, SERVICES, ADDRESSES, AND TESTIMONIALS AND PRESENT THEM IN A WELL-DEFINED JSON FORMAT SUITABLE FOR FURTHER MANIPULATIONS WITHIN A CODEBASE.

            INSTRUCTIONS
            - ALWAYS ANSWER TO THE USER IN THE MAIN LANGUAGE OF THEIR MESSAGE.
            - YOU MUST PARSE THE PROVIDED TEXT TO IDENTIFY AND EXTRACT THE SPECIFIED ELEMENTS.
            - OUTPUT THE EXTRACTED DATA IN A WELL-DEFINED JSON FORMAT.
             
            Chain of Thoughts
            Follow the instructions in the strict order:
            1. Understanding User Requirements:
               1.1. Carefully read and understand the specific elements specified by the user.
               1.2. Ensure clarity on the exact information required (email address, class or ID, services, addresses, testimonials).
             
            2. Parsing the TEXT:
               2.1. Analyze the provided TEXT structure.
               2.2. Identify and locate HTML elements and attributes that represent the specified elements.
             
            3. Extracting Information:
               3.1. Extract the specified elements, ensuring validity and correctness.
             
            4. Formatting Output:
               4.1. Organize the extracted data into a JSON format.
               4.2. Ensure the JSON structure is clear, accurate, and suitable for further manipulations within a codebase.
             
            5. Final Validation:
               5.1. Review the JSON output for completeness and accuracy.
               5.2. Ensure all requested information is included and correctly formatted.
             
            Example JSON Output Format
            {
              "emails": ["example1@example.com", "example2@example.com"],
              "comment_input": {
                "class": "comment-input-class",
                "id": "comment-input-id"
              },
              "services": ["Service 1", "Service 2"],
              "addresses": ["Address 1", "Address 2"],
              "testimonials": ["Testimonial 1", "Testimonial 2"]
            }
             
            What Not To Do
             
            OBEY and never do:
             
            NEVER IGNORE USER-SPECIFIED ATTRIBUTES.
            NEVER PROVIDE INCOMPLETE OR INACCURATE INFORMATION.
            NEVER OUTPUT DATA IN A FORMAT OTHER THAN JSON.
            NEVER OMIT VALIDATION OF EXTRACTED INFORMATION.
            NEVER FAIL TO ENSURE THE JSON STRUCTURE IS SUITABLE FOR CODEBASE MANIPULATIONS.
             
            the text of the website is: ${text}
            `,
          },
        ],
      },
    ],
  };

  const response = await axios.post(process.env.GEMINI_KEY, body);

  return response.data;
};

const getScrapingData = async (url) => {
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

    return { geminiResponses, emails, time };
  } catch (error) {
    console.error('Error:', error);
    return { url, error };
  }
};

// Route to scrape data from the URL and return the results
app.get('/scrape', async (req, res) => {
  try {
    const urls = ['https://vetteltech.com/'];
    const scrapingResults = await Promise.all(
      urls.map((url) => getScrapingData(url))
    );

    const results = scrapingResults.map(
      ({ geminiResponses, emails, time }) => ({
        geminiResponses,
        emails,
        time,
      })
    );

    res.status(200).json(results);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function getTextFromUrl(url)  {
  try {
    const response = await axios.post('http://localhost:3200/get-url-text', { url })
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    return []
  }
}

// Route to scrape data from the URL and return the results
app.get('/scrape-from-text', async (req, res) => {
  const { url } = req.query;
  try {
    const text = await getTextFromUrl(url);

    const response = await getGeminiResponse(text);

    // Extract the response and parse it to JSON
    const geminiResponsesText =
      response.candidates[0].content.parts[0].text;

    // Remove unnecessary backticks and newlines
    const cleanedText = geminiResponsesText
      .replace(/```json\n/g, '')
      .replace(/\n```/g, '')
      .replace('\n', '');

    let geminiResponses;
    try {
      geminiResponses = JSON.parse(cleanedText);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      geminiResponses = geminiResponsesText;
    }

    res.status(200).json({
      success: true,
      data: geminiResponses
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(30001, () => {
  console.log('Server running on port 30001');
});
