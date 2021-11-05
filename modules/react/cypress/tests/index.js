/* global Cypress, cy */

const iframe = "#storybook-preview-iframe";

describe("@valuemachine/react", () => {
  beforeEach(() => {
    const url = `${Cypress.env("baseUrl")}/`;
    cy.visit(url);
    cy.frameLoaded(iframe);
  });

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
      "addresstable--example",
    ]) {
      const url = `${Cypress.env("baseUrl")}/?path=/story/${component}`;
      cy.visit(url);
      cy.frameLoaded(iframe);
      cy.iframe(iframe).should("exist");
      cy.iframe(iframe).find("div#storybook-root").should("exist");
    }
  });

});
