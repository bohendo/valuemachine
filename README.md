
# Tax Return

Better tools for filling out form 1040 & friends.

# Disclaimer

I am not even remotely qualified to be doing this.

If you use this repo to generate tax return forms, **proof read the output carefully before sending it to the IRS**.

This repo certainly has some bugs lurking and, if you put your blind faith in it, the IRS will likely have some problems w you.

Those are not my problems, use these tools at your own risk. Do your own research.

# Prerequisites

 - `jq`: Probably not installed yet, install w `brew install jq` or `apt install jq` or similar.
 - `make`: Probably already installed, otherwise install w `brew install make` or `apt install make` or similar.
 - [`docker`](https://www.docker.com/): See website for instructions.

# Building your taxes

Run `make example` to generate a simple example tax return based on the data in `example.json`

Create a copy of `example.json` that will contain your personal data: `cp example.json personal.json`

Then, to generate your tax returns, update the relevant info in `personal.json` and run `make personal` (or just `make`)

# Important note re sensitive data

To generate a valid tax return, you'll want to add your social security number & other sensitive data to `personal.json`. This file is added to the .gitignore so you're less likely to accidentally commit/push this personal data. But if you rename it to something like `personal.json.backup` then you could still accidentally commit it, so be careful & review diffs before you push.

This also means that `personal.json` won't automatically be backed up to a remote repo as part of your fork of this repo. You'll probably spend a fair amount of time updating the info in `personal.json` so take care of this file & don't lose it. You can create a zipped archive of your personal data and attachments (expected to be in `docs/`) with the command: `make backup` & then copy this output somewhere safe.

# Adding support for a new form

Say we need form f1040s3 to file our taxes and it's not supported yet. Here are the steps for adding support for this new form:

1. Fetch the new form: `bash ops/fetch.sh f1040s3`

2. Add "f1040s3" to the forms list in the test data: `test.json`

3. Run `node ops/update-mappings.js -y` to create an auto-generated set of mappings, these can be hand-edited later to be made more human readable but the auto-generated ones work just fine.

4. Import & export this new set of mappings from `src/mappings/index.ts`, also add it to the `Form` type definition.

5. Copy the filer template to create a new filer module `cp src/filers/template.ts src/filers/f1040s3.ts`, change the exported function's name, and export this new filer function from `src/filers/index.ts`

5. Run `make test` to generate a test tax return, how does your new form look? Check it out at: `./build/test/tax-return.pdf`

6. (optional) if you want to rename the `f1_1` mapping to be called `fullName` for example, then change this field in `src/mappings/f1040nf.pdf` and then re-run `node ops/update-mappings.js -y`

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
