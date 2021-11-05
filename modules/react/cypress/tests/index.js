/* global Cypress, cy */

describe("@valuemachine/react", () => {
  beforeEach(() => {
    console.log("beforeEach()");
  });

  it(`should load the address editor`, () => {
    cy.visit(`${Cypress.env("baseUrl")}/?path=/story/addresseditor--insert`);
  });

});
