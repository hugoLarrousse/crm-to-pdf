const fs = require('fs');
const path = require('path');
const utils = require('util');
const puppeteer = require('puppeteer');
const hb = require('handlebars');

const readFile = utils.promisify(fs.readFile);

async function getTemplateHtml() {
  console.log('Loading template file in memory');
  try {
    const invoicePath = path.resolve('./template.html');
    return await readFile(invoicePath, 'utf8');
  } catch (err) {
    throw Error('no file found');
  }
}

async function generatePdf(data) {
  try {
    const templateHtml = await getTemplateHtml();

    const template = hb.compile(templateHtml);
    const result = template(data);

    // we are using headless mode
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // We set the page content as the generated html by handlebars
    await page.setContent(result);

    // we Use pdf function to generate the pdf in the same folder as this file.
    await page.pdf({
      path: `./pdfs/doc-${Date.now()}.pdf`,
      format: 'A4',
    });

    await browser.close();
    console.log('PDF Generated');
  } catch (e) {
    console.log(e.message);
  }
}

exports.generatePdf = generatePdf;
