# Joel Montgomery Graphics

[joelmontgomery.graphics](https://joelmontgomery.graphics/) is home to design utilities, games and other personal projects.

## Design utilities

The [Design Utilities page](https://joelmontgomery.graphics/tools/) brings together tools for preparing SVG artwork for Easil and barcode data for Adobe InDesign.

| Tool | What it does |
| --- | --- |
| [Shape Mask Converter](https://joelmontgomery.graphics/tools/shape-mask/) | Creates image masks from vector shapes, with options for multiple mask areas and a matching thumbnail. |
| [Stretch & Repeat Converter](https://joelmontgomery.graphics/tools/stretch-repeat/) | Creates elements with a repeating centre and fixed endcaps. |
| [Repeating Shape Converter](https://joelmontgomery.graphics/tools/repeat/) | Turns artwork into a horizontally repeating element. |
| [Stretchable Shape Converter](https://joelmontgomery.graphics/tools/stretchable/) | Splits artwork into sections for horizontal, vertical or both-direction stretching. |
| [Trim SVG Contents](https://joelmontgomery.graphics/tools/trim/) | Removes transparent space around artwork, including clipped and masked shapes. Drop multiple SVGs to trim and download them automatically. |
| [Barcode Data Merge](https://joelmontgomery.graphics/tools/barcode/) | Prepares Code 128B barcodes for InDesign Data Merge, retaining the original columns and adding a formatted barcode column. |

The SVG tools include instructions for preparing artwork and downloading the converted files.

### Using Barcode Data Merge

Upload a UTF-8 TSV, CSV or TXT file, or paste codes or spreadsheet cells into the tool. Choose the separator (tabs or commas), indicate whether the first row contains headings, and preview the data. Select the source column containing barcode values, then download the output for InDesign. The exported Unicode (UTF-16 LE), tab-delimited TXT retains all existing data and adds a new column (named `BarcodeFormatted` by default) with Code 128B-formatted values.

In InDesign, import the TXT as **Unicode** and **tab-delimited** data, then apply the **Libre Barcode 128** font to the formatted barcode field. Barcode source values must contain printable ASCII characters (32–126).

## Other projects

The site also includes [Joeldle](https://joelmontgomery.graphics/joeldle/), [Joelculator](https://joelmontgomery.graphics/calculator/) and a few hidden extras.
