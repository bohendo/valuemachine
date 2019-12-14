
# Tax Return

Better tools for filling out form 1040 & friends for 2019 US taxes.

# Disclaimer

I am not even remotely qualified to be doing this.

This repo certainly has some bugs lurking and, if you put your faith in it, the IRS will likely have some problems w you.

Those are not my problems, use these tools at your own risk. Do your own research.

# Prerequisites

`make`: Probably already installed, otherwise run something like `brew install make` or `apt-get install make`

`python` & `pip`: Probably already installed, otherwise checkout [installation instructions](https://www.python.org/downloads/)

`pdftk`: See [installation instructions](https://www.pdflabs.com/tools/pdftk-server/). The standard installation is broken on Mac, use [this one](https://stackoverflow.com/a/39814799) instead.

# Building your taxes

Run `make` to generate John Doe's example tax returns. This project pulls example input from `src/examples` and outputs the tax return to `build/examples/tax-return.pdf`.

To build your own tax returns, create similar data in `src` as is in `src/examples`. For example, try copying the example data (`cp -r src/examples/* src/`) and then make changes according to your own situation.

All files & folders in `src` besides `src/examples` are ignored by git. This makes it less likely that your social security number will leak out of your local copy of this repo. It also means that your tax return inputs won't be automatically backed up outside your own computer so be careful with it.

Running `make` will build both the example output and your personal tax return.

# Forms Overview

**Bold** forms are ones that are supported or in active development

## Form 1040

Root of the tax form tree

Attachments:
 - W-2: Reports income from employer
 - W-2G:
 - 1099-R:

Dependencies:
 - **Schedule 1**: Other income & deductions
 - **Schedule 2**: Additional tax
 - **Schedule 3**: Tax credits
 - Schedule A: Deduction Details
 - **Schedule D**: Capital gains income/loss
 - Form 4972: Tax on Lump-Sum Distributions
 - Form 8814: Parents’ Election To Report Child’s Interest and Dividends
 - Form 8888: Allocation of Refund (Including Savings Bond Purchases)
 - _Form 8995: Qualified Business Income Deductions (Form not available?)_

## Schedule 1

Additional Income and Adjustments to Income

Dependencies:
 - **Schedule C** (or C-EZ): Business income/loss
 - Schedule E: Real-estate/trust/S-Corp income/loss
 - Schedule F: Profit or Loss From Farming
 - **Schedule SE**: self-employment taxes
 - Form 2106: Employee Business Expenses
 - Form 3903: Military Moving Expenses
 - Form 4797: Sales of Business Property
 - Form 8889: Health Savings Accounts (HSAs)
 - **Form 2555**: Foreign Earned Income

## Schedule 2

Additional Taxes

Dependencies:
 - Schedule H: Household Employment Taxes
 - Form 965: Net Tax Liability
 - Form 5329: Additional Tax on Tax-favoured accounts
 - _Form 6251: Alternative Minimum Tax—Individuals_
 - Form 8959: Additional Medicare Tax
 - Form 8960: Net Investment Income Tax— Individuals, Estates, and Trusts
 - *Form 8962*: Premium Tax Credit

## Schedule 3

Tax Credits

Dependencies:
  - **Form 1116**: Foreign Tax Credit
  - Form 2439: Shareholder of undistributed long-term capital gains
  - Form 2441: Child and dependent care expenses
  - Form 3800: Other credits
  - Form 4136: Credits for fuels
  - Form 5695: Residential energy
  - Form 8801: Other credits
  - Form 8863: Education credit
  - Form 8880: Retirement savings contribution
  - Form 8885: Health coverage tax credit
 - *Form 8962*: Premium Tax Credit
  

## Schedule SE

Self-employment taxes

Dependencies:
 - Form 1065: U.S. Return of Partnership Income
 - Form 4137: Social Security and Medicare Tax on Unreported Tip Income
 - Form 4361: Application for Exemption From Self-Employment Tax for Use by Ministers, etc
 - Form 8919: Uncollected Social Security and Medicare Tax on Wages
 - **Schedule C: Profit or Loss From Business**
 - Schedule F: Profit or Loss From Farming
 - Schedule K-1: Partner’s Share of Income, Deductions, Credits, etc

## Schedule C

Profit or Loss from Business

Attachments:
 - Form 1099: Reports income from self employment earnings

Dependencies:
 - Form 4562: Depreciation and Amortization
 - Form 6198: At-Risk Limitations
 - Form 8829: Expenses for Business Use of Your Home

## Schedule D

Capital Gains and Losses

Attachments:
 - 1099-B: Proceeds From Broker and Barter Exchange Transactions

Dependencies:
 - Form 2439: Notice to Shareholder of Undistributed Long-Term Capital Gains
 - Form 4684: Casualties and Thefts
 - Form 4787: Sales of Business Property
 - Form 6252: Installment Sale Income
 - Form 6781: Gains and Losses From Contracts and Straddles
 - Form 8824: Like-Kind Exchanges
 - **Form 8949**: Sales and Other Dispositions of Capital Assets
 - Schedule K-1: Partner’s Share of Income, Deductions, Credits, etc
