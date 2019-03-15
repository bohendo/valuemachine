
# Tax Return

Better tools for filling out form 1040 & friends for 2018 US taxes.

# Prerequisites

`make`: Probably already installed, otherwise run something like `brew install make` or `apt-get install make`

`python` & `pip`: Probably already installed, otherwise checkout [installation instructions](https://www.python.org/downloads/)

`pdftk`: See [installation instructions](https://www.pdflabs.com/tools/pdftk-server/). The standard installation is broken on Mac, use [this one](https://stackoverflow.com/a/39814799) instead.

# Building your taxes

Run `make example` to generate John Doe's example tax returns (using input data from `input/examples`).

Make a copy of the example data to your own `personal-data` folder (`cp -r examples personal-data`) and edit the input to suit your situation. Then run `make` and check out your tax return pdf files in the `build` folder.

# Forms Overview

**Bold** forms are ones that are supported or in active development

## Form 1040

Root of the tax form tree

Attachments:
 - W-2: Income verification from Employer
 - W-2G: ???
 - 1099-R: ???

Dependencies:
 - Schedule 1: Other income & deductions
 - Schedule 2: Alternative minimum tax
 - Schedule 3: Tax credits
 - Schedule 4: Other tax eg self-employment tax
 - Schedule 5: Other refund credits
 - Schedule 6: Foreign address or paid preparer details
 - Schedule A: deduction details
 - Form 8814:
 - Form 4972:
 - Form 8888:

## Schedule 1

Additional Income and Adjustments to Income

Dependencies:
 - Schedule C (C-EZ): Business income/loss
 - Schedule D: Capital gains income/loss
 - Schedule E: Real-estate/trust/S-Corp income/loss
 - Schedule F: Farming income/loss
 - Schedule SE: self-employment taxes
 - Form 4797:
 - Form 2106:
 - Form 8889:
 - Form 3903:

## Schedule C
## Schedule D

Capital Gains and Losses

Attachments:
 - 1099-B: Proceeds From Broker and Barter Exchange Transactions

Dependencies:
 - Schedule K-1: Partner’s Share of Income, Deductions, Credits, etc
 - Form 2439: Notice to Shareholder of Undistributed Long-Term Capital Gains
 - Form 4684: Casualties and Thefts
 - Form 4787: Sales of Business Property
 - Form 6252: Installment Sale Income
 - Form 6781: Gains and Losses From Contracts and Straddles
 - Form 8824: Like-Kind Exchanges
 - **Form 8949**: Sales and Other Dispositions of Capital Assets

# TODO

1. Mappings from json data to schedule D fields
2. Create some example Schedule D input

# Disclaimer

I am not even remotely qualified to be doing this.

This code likely has bugs and if you put your faith in it, the IRS will likely have some problems w you.

Those are not my problems, use these tools at your own risk. Do your own research.
