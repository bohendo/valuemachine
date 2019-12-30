
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

 - [x] Checked forms are supported by this repo.

## Form 1040

Root of the tax form tree

Dependencies:
 - [ ] Form 4972: Tax on Lump-Sum Distributions
 - [ ] Form 8814: Parents’ Election To Report Child’s Interest and Dividends
 - [ ] Form 8863: Education Credits
 - [ ] Form 8888: Allocation of Refund (Including Savings Bond Purchases)
 - [ ] Form 8995: (Does Not Exist)
 - [x] Schedule 1: Additional Income & Adjustments to Income
 - [x] Schedule 2: Additional Tax
 - [x] Schedule 3: Additional Credits and Payments
 - [ ] Schedule 8812: (Does Not Exist)
 - [ ] Schedule A: Itemized Deductions
 - [x] Schedule D: Capital Gains and Losses

## Schedule 1

Additional Income and Adjustments to Income

Dependencies:
 - [ ] Form 2106: Employee Business Expense (Military/Govt)
 - [ ] Form 3903: Moving Expenses (Military)
 - [ ] Form 4797: Sales of Business Property
 - [ ] Form 8889: Health Savings Account
 - [ ] Form 8917: (Does Not Exist)
 - [x] Schedule C: Profit or Loss From Business
 - [ ] Schedule E: Supplemental Income and Loss
 - [ ] Schedule F: Profit or Loss From Farming
 - [x] Schedule SE: Self-Employment Tax

## Schedule 2

Additional Taxes

Dependencies:
 - [ ] Form 4137: Social Security and Medicare Tax on Unreported Tip Income
 - [ ] Form 5329: Additional Taxes on Qualified Plans (Including IRAs) and Other Tax-Favored Accounts
 - [ ] Form 5405: Repayment of the First-Time Homebuyer Credit
 - [ ] Form 6251: (2018) Alternative Minimum Tax - Individuals
 - [ ] Form 8919: Uncollected Social Security and Medicare Tax on Wages
 - [ ] Form 8959: Additional Medicare Tax
 - [ ] Form 8960: Net Investment Income Tax - Individuals, Estates, and Trusts
 - [ ] Form 8962: Premium Tax Credit (PTC)
 - [ ] Form 965: Inclusion of Deferred Foreign Income Upon Transition to Participation Exemption System
 - [ ] Schedule H: Household Employment Taxes
 - [x] Schedule SE: Self-Employment Tax

## Schedule 3

Tax Credits

Dependencies:
 - [ ] Form 1116: Foreign Tax Credit
 - [ ] Form 2439: Notice to Shareholder of Undistributed Long-Term Capital Gains
 - [ ] Form 2441: Child and Dependent Care Expenses
 - [ ] Form 3800: General Business Credit
 - [ ] Form 4136: Credit for Federal Tax Paid on Fuels
 - [ ] Form 5695: Residential Energy Credit
 - [ ] Form 8801: Credit for Prior Year Minimum Tax - Individuals, Estates, and Trusts
 - [ ] Form 8863: Education Credits (American Opportunity and Lifetime Learning Credits)
 - [ ] Form 8880: Credit for Qualified Retirement Savings Contributions
 - [ ] Form 8885: Health Coverage Tax Credit
 - [ ] Form 8962: Premium Tax Credit (PTC)

## Schedule SE

Self-employment taxes

Dependencies:
 - [ ] Form 1065: U.S. Return of Partnership Income
 - [ ] Form 4137: Social Security and Medicare Tax on Unreported Tip Income
 - [ ] Form 4361: Application for Exemption From Self-Employment Tax for Use by Ministers, etc
 - [ ] Form 8919: Uncollected Social Security and Medicare Tax on Wages
 - [x] Schedule C: Profit or Loss From Business
 - [ ] Schedule F: Profit or Loss From Farming
 - [ ] Schedule K-1: Partner’s Share of Income, Deductions, Credits, etc

## Schedule C

Profit or Loss from Business

Dependencies:
 - [ ] Form 4562: Depreciation and Amortization
 - [ ] Form 6198: At-Risk Limitations
 - [ ] Form 8829: Expenses for Business Use of Your Home

## Schedule D

Capital Gains and Losses

Dependencies:
 - [ ] Form 2439: Notice to Shareholder of Undistributed Long-Term Capital Gains
 - [ ] Form 4684: Casualties and Thefts
 - [ ] Form 4797: Sales of Business Property
 - [ ] Form 6252: Installment Sale Income
 - [ ] Form 6781: Gains and Losses From Section 1256 Contracts and Straddles
 - [ ] Form 8824: Like-Kind Exchanges
 - [x] Form 8949: Sales and Other Dispositions of Capital Assets
