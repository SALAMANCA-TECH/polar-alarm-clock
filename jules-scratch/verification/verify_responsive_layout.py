import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        html_file_path = os.path.abspath('index.html')

        # Go to the local HTML file
        await page.goto(f'file://{html_file_path}')

        # Mobile view
        await page.set_viewport_size({'width': 375, 'height': 667})
        await page.screenshot(path='jules-scratch/verification/mobile-view-2.png')

        # Desktop view
        await page.set_viewport_size({'width': 1280, 'height': 720})
        await page.screenshot(path='jules-scratch/verification/desktop-view-2.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
