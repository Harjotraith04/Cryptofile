/// <reference types="cypress" />
// The app has to be running in dev mode
// Tests are done on chrome
// Avoid running all test files at the same time

import { currentVersion, APP_URL } from "../../src/config/Constants";
import "cypress-file-upload";
import "cypress-real-events/support";

const path = require("path");
const downloadsFolder = Cypress.config("downloadsFolder");

let aliceKeys = { publicKey: null, privateKey: null };
let bobKeys = { publicKey: null, privateKey: null };

describe("Asymmetric encryption test", () => {
  beforeEach(() => {
    cy.visit('/');
    cy.contains("Hat.sh");
    cy.contains(currentVersion);
  });

  it("loads a file and generate keys for two parties then encrypt", () => {
    cy.wait(2500);
    const file = "../files/document.txt";
    cy.contains("Choose files to encrypt");
    cy.get(".submitFile").should("be.disabled");
    cy.get("#enc-file").attachFile(file);
    cy.get(".submitFile").realClick();

    cy.wait(500);
    cy.contains("Choose a strong Password");
    cy.get(".submitKeys").should("be.disabled");
    cy.contains("Generate now").realClick();
    cy.get(".keyPairGenerateBtn").click();

    cy.get("#generatedPublicKey")
      .invoke("val")
      .then((val) => {
        aliceKeys.publicKey = val;
      });

    cy.get("#generatedPrivateKey")
      .invoke("val")
      .then((val) => {
        aliceKeys.privateKey = val;
      });

    cy.log(aliceKeys);

    cy.get(".keyPairGenerateBtn").click();

    cy.get("#generatedPublicKey")
      .invoke("val")
      .then((val) => {
        bobKeys.publicKey = val;
      });

    cy.get("#generatedPrivateKey")
      .invoke("val")
      .then((val) => {
        bobKeys.privateKey = val;
      });

    cy.log(bobKeys);

    cy.get("#closeGenBtn").realClick();
    cy.wait(500);

    cy.get("#private-key-input")
      .realClick()
      .then(() => {
        cy.realType(aliceKeys.privateKey);
      });

    cy.get(".submitKeys").realClick();
    cy.wait(500);

    cy.window().document().then(function (doc) {
      doc.addEventListener("click", () => {
        setTimeout(function () {
          doc.location.reload();
        }, 2500);
      });

      cy.intercept("/", (req) => {
        req.reply((res) => {
          expect(res.statusCode).to.equal(200);
        });
      });

      cy.get(".downloadFile").realClick();
    });

    cy.wait(2500);
  });

  it("verify the encrypted file path", () => {
    let encryptedFile = path.join(downloadsFolder, "document.txt.enc");
    cy.readFile(encryptedFile).should("exist");
  });

  it("loads a file and decrypt using the sender public key and the recipient private key", () => {
    cy.visit(`${Cypress.config('baseUrl')}/?tab=decryption`);
    cy.wait(2500);

    const file = "../downloads/document.txt.enc";
    cy.contains("Choose files to decrypt");
    cy.get(".submitFileDec").should("be.disabled");
    cy.fixture(file, "binary")
      .then(Cypress.Blob.binaryStringToBlob)
      .then((fileContent) => {
        cy.get("#dec-file").attachFile({
          fileContent,
          fileName: "document.txt.enc",
          mimeType: "application/octet-stream",
          encoding: "utf-8",
          lastModified: new Date().getTime(),
        });
      });
    cy.get(".submitFileDec").realClick();
    cy.wait(500);

    cy.contains("Enter sender's Public key and your Private Key");
    cy.get(".submitKeysDec").should("be.disabled");

    cy.wait(500);

    cy.get("#private-key-input-dec")
      .realClick()
      .then(() => {
        cy.realType(bobKeys.privateKey);
      });

    cy.get(".submitKeysDec").realClick();
    cy.wait(500);

    cy.window().document().then(function (doc) {
      doc.addEventListener("click", () => {
        setTimeout(function () {
          doc.location.reload();
        }, 2500);
      });

      cy.intercept("/", (req) => {
        req.reply((res) => {
          expect(res.statusCode).to.equal(200);
        });
      });

      cy.get(".downloadFileDec").realClick();
    });

    cy.wait(2500);
  });

  it("verify the decrypted file path", () => {
    let decryptedFile = path.join(downloadsFolder, "document.txt");
    cy.readFile(decryptedFile).should("exist");
  });

  it("cleans downloads folder", () => {
    cy.task("deleteFolder", downloadsFolder);
  });
});
