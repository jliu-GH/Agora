#!/usr/bin/env tsx

/**
 * Simple Bill Scraper Test
 * A simplified test to validate congress.gov access and basic scraping
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

async function testSimpleBillScraping() {
  console.log('🧪 Testing simple congress.gov bill scraping...\n');
  
  let browser: puppeteer.Browser | null = null;
  
  try {
    // Initialize browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Test URL - simpler approach
    const testUrl = 'https://www.congress.gov/search?q=%7B%22source%22%3A%22legislation%22%2C%22type%22%3A%22bills%22%2C%22congress%22%3A%22119%22%7D&pageSort=latestAction%3Adesc';
    
    console.log(`📡 Accessing: ${testUrl}`);
    
    // Navigate to page
    await page.goto(testUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Wait for results
    try {
      await page.waitForSelector('.results-item', { timeout: 10000 });
      console.log('✅ Found search results');
    } catch (error) {
      console.log('⚠️ No results found, checking page content...');
    }
    
    // Get page content
    const content = await page.content();
    const $ = cheerio.load(content);
    
    console.log(`📄 Page title: ${$('title').text()}`);
    
    // Look for bill results
    const resultItems = $('.results-item');
    console.log(`📊 Found ${resultItems.length} result items`);
    
    if (resultItems.length > 0) {
      console.log('\n📋 Sample bills found:');
      
      resultItems.slice(0, 3).each((index, element) => {
        const $el = $(element);
        const titleLink = $el.find('.result-heading a').first();
        const title = titleLink.text().trim();
        const url = titleLink.attr('href');
        
        console.log(`   ${index + 1}. ${title}`);
        if (url) {
          console.log(`      URL: https://www.congress.gov${url}`);
        }
      });
    } else {
      // Check for alternative selectors
      const alternativeResults = $('.results-number, .search-results, .result');
      console.log(`🔍 Alternative results found: ${alternativeResults.length}`);
      
      if (alternativeResults.length > 0) {
        console.log('📝 Page contains search results, but structure may be different');
        console.log('🔧 Scraper may need selector adjustments');
      } else {
        console.log('❌ No bill results found on page');
        console.log('🔍 Page may require different approach or selectors');
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testSimpleBillScraping().catch(console.error);
