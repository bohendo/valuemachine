/* global Cypress, cy */

const iframe = "#storybook-preview-iframe";

describe("@valuemachine/react", () => {
  it(`should display the address editor`, () => {
    const url = `${Cypress.env("baseUrl")}/?path=/story/addresseditor--insert`;
    cy.visit(url);
    cy.frameLoaded(iframe);
    cy.iframe(iframe).should("exist");
    cy.iframe(iframe).find("input#input-text-account-name").type("foobar");
  });

  it(`should load all components`, () => {
    for (const component of [
      "addresseditor--insert",
      "addresseditor--modify",
      "addressporter--example",
      "addresstable--example",
      "csvporter--example",
      "csvtable--example",
      "inputporter--example",
      "balances--example",
      "balancetable--example",
      "networthtable--example",
      "taxinputeditor--example",
      "taxporter--example",
      "taxtable--example",
      "transactioneditor--example",
      "transactionporter--example",
      "transactiontable--editable",
      "transactiontable--readonly",
      "txtagseditor--new-tag",
      "txtagseditor--edit-tag",
      "txtagsporter--example",
      "dateinput--example",
      "datetimeinput--example",
      "hexstring--bytes-32",
      "hexstring--address",
      "hexstring--named-address",
      "hexstring--account",
      "hexstring--named-account",
      "hexstring--venue-account",
      "hexstring--tx-uuid",
      "hexstring--transfer-uuid",
      "hexstring--eth-2-validator",
      "selectmany--example",
      "selectone--example",
      "textinput--example",
      "chunktable--example",
      "eventtable--example",
    ]) {
      const url = `${Cypress.env("baseUrl")}/?path=/story/${component}`;
      cy.visit(url);
      cy.frameLoaded(iframe);
      cy.iframe(iframe).should("exist");
      cy.iframe(iframe).find("div#storybook-root").should("exist");
    }
  });

});
