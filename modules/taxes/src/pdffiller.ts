import * as _ from "lodash";

import { generateFdf } from "./fdf-generator";

export const getPdfUtils = (libs: { fs: any, execFile: any, Iconv: any }) => {
  const { fs, execFile, Iconv } = libs;
  if (!fs) throw new Error(`Node fs module must be injected`);
  if (!execFile) throw new Error(`Node execFile module must be injected`);
  if (!Iconv) throw new Error(`Iconv binary module must be injected`);

  return ({

    mapForm2PDF: function( formFields, convMap ){
      let tmpFDFData = this.convFieldJson2FDF(formFields);
      tmpFDFData = _.mapKeys(tmpFDFData, function(value, key){
        return convMap?.[key] || key;
      });
      return tmpFDFData;
    },

    convFieldJson2FDF: function(fieldJson){
      const _keys = _.map(fieldJson, "title");
      let _values = _.map(fieldJson, "fieldValue");
      _values = _.map(_values, function(val){
        if(val === true){
          return "Yes"; // TODO: fetch required value instead of assuming "Yes"
        } else if(val === false) {
          return "Off";
        }
        return val;
      });
      return _.zipObject(_keys, _values);
    },

    generateFieldJson: function( sourceFile, nameRegex, callback){
      let regName = /FieldName: ([^\n]*)/;
      const regType = /FieldType: ([A-Za-z\t .]+)/;
      const regFlags = /FieldFlags: ([0-9\t .]+)/;
      const fieldArray = [];
      let currField = {};
      if(nameRegex !== null && (typeof nameRegex) == "object" ) regName = nameRegex;
      execFile( "pdftk", [sourceFile, "dump_data_fields_utf8"], function (error, stdout, _stderr) {
        if (error) {
          console.log("exec error: " + error);
          return callback(error, null);
        }
        const fields = stdout.toString().split("---").slice(1);
        fields.forEach(function(field){
          currField = {};
          currField["title"] = field.match(regName)[1].trim() || "";
          if(field.match(regType)){
            currField["fieldType"] = field.match(regType)[1].trim() || "";
          }else {
            currField["fieldType"] = "";
          }
          if(field.match(regFlags)){
            currField["fieldFlags"] = field.match(regFlags)[1].trim()|| "";
          }else{
            currField["fieldFlags"] = "";
          }
          currField["fieldValue"] = "";
          fieldArray.push(currField);
        });
        return callback(null, fieldArray);
      });
    },

    generateFDFTemplate: function( sourceFile, nameRegex, callback ){
      this.generateFieldJson(sourceFile, nameRegex, function(err, _form_fields){
        if (err) {
          console.log("exec error: " + err);
          return callback(err, null);
        }
        return callback(null, this.convFieldJson2FDF(_form_fields));
      }.bind(this));
    },

    fillFormWithOptions: function(
      sourceFile,
      destinationFile,
      fieldValues,
      shouldFlatten,
      tempFDFPath,
      callback,
    ) {
      //Generate the data from the field values.
      const randomSequence = Math.random().toString(36).substring(7);
      const currentTime = new Date().getTime();
      const tempFDFFile =  "temp_data" + currentTime + randomSequence + ".fdf";
      const tempFDF = (typeof tempFDFPath !== "undefined"? tempFDFPath + "/" + tempFDFFile: tempFDFFile);
      generateFdf(fieldValues, tempFDF, { fs, Iconv });
      const args = [sourceFile, "fill_form", tempFDF, "output", destinationFile];
      if (shouldFlatten) {
        args.push("flatten");
      }
      execFile( "pdftk", args, function (error, _stdout, _stderr) {
        if ( error ) {
          console.log("exec error: " + error);
          return callback(error);
        }
        //Delete the temporary fdf file.
        fs.unlink( tempFDF, function( err ) {
          if ( err ) {
            return callback(err);
          }
          // console.log( "Sucessfully deleted temp file " + tempFDF );
          return callback();
        });
      } );
    },

    fillFormWithFlatten: function(
      sourceFile,
      destinationFile,
      fieldValues,
      shouldFlatten,
      callback,
    ) {
      this.fillFormWithOptions(
        sourceFile,
        destinationFile,
        fieldValues,
        shouldFlatten,
        undefined,
        callback,
      );
    },

    fillForm: function(
      sourceFile,
      destinationFile,
      fieldValues,
      callback,
    ) {
      this.fillFormWithFlatten(
        sourceFile,
        destinationFile,
        fieldValues,
        true,
        callback,
      );
    }

  });
};
