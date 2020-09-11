const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const hb = require('handlebars');

async function getTemplateHtml() {
  try {
    const invoicePath = path.resolve('./template.html');
    return await fs.readFile(invoicePath, 'utf8');
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
