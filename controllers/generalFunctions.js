/*
 * (C) Copyright 2017 o2r project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

'use strict';

const fs = require('fs');
const debug = require('debug')('bindings');
const path = require('path');
const exec = require('child_process').exec;

let fn = {};

fn.readRmarkdown = function(compendiumId, mainfile) {
    debug('Start reading RMarkdown %s from compendium %s', 
            mainfile, compendiumId);
    if ( !compendiumId | !mainfile ) {
        throw new Error('File does not exist.');
    }
    let paper = path.join('tmp', 'o2r', 'compendium', compendiumId, mainfile);
    fs.exists(paper, function(ex) {
        if (!ex) {
            debug('Cannot open file %s', paper);
            throw new Error('File does not exist.');
        }
    });
    debug('End reading RMarkdown');
    return fs.readFileSync(paper, 'utf8');
};

fn.modifyMainfile = function(fileContent, result, file, compendiumId) {
    debug('Start modifying file %s from %s for %s',
            file, compendiumId, result.value);
    if (result.type == 'number') {
        /* let splitFileContent = fileContent.split('\n');
        let lor = binding.lineOfResult-1;
            splitFileContent[lor] = splitFileContent[lor].replace(new RegExp(binding.result), '__' + binding.result + '__');
        let newContent = '';
            splitFileContent.forEach(function(elem) {
                newContent = newContent + elem + '\n';
            });
        fn.saveRmarkdown(newContent, binding.id, binding.mainfile); 
        debug('End modifying file');*/
    } else if (result.type == 'figure') {
        fileContent = fileContent.replace(new RegExp(result.value, 'g'), '**_' + result.value + '_**');
        fn.saveRFile(fileContent, compendiumId, file);
        /* exec('Rscript -e "rmarkdown::render(\'' + path.join('tmp', 'o2r', 'compendium', compendiumId, file) + '\')"', function(err) {
            if (err) throw err;
        }); */
        debug('End modifying file');
    }
};

fn.replaceVariable = function(code, parameter) {
    debug('Start replacing parameter %s', parameter.text);
    let newContent = code.replace(parameter.text, parameter.varName + ' = newValue');
    debug('End replacing parameter');
    return newContent;
};

fn.handleCodeLines = function(lines) {
    debug('Start handling code lines');
    let codeLines = [];
    lines.forEach(function(elem) {
        for (let i = elem.start; i <= elem.end; i++) {
            codeLines.push(Number(i)-1); // -1 is required as the code lines from the front end start counting at 1.
        };
    });
    debug('End handling code lines');
    return codeLines.sort(function(a, b) {
        return a-b;
    });
};

fn.extractCode = function(fileContent, codeLines) {
    debug('Start extracting code');
    let newContent = '';
    let splitFileContent = fileContent.split('\n');
    codeLines.forEach(function(elem) {
        newContent += splitFileContent[elem] + '\n';
    });
    debug('End extracting code');
    return newContent;
};

fn.wrapCode = function(sourcecode, compendiumId, result, value) {
    debug('Start wrapping code');
    let get = "#' @get /" + result.replace(/\s/g, '').toLowerCase() + '\n' +
                "#' @png \n" +
                'function(newValue){ \n';
    if (!isNaN(value)) {
        get = get + 'newValue = as.numeric(newValue) \n';
    }
    let code = sourcecode.split('\n');
        //code[code.length-2] = 'print(' + code[code.length-2] + ')';
    let newCode = '';
        code.forEach(function(elem) {
            newCode += elem + '\n';
        });
    let newContent = get + newCode + '}';
    debug('End wrapping code');
    return newContent;
};

fn.readCsv = function(compendiumId, datasets) {
    if ( !compendiumId | datasets ) {
        throw new Error('File does not exist.');
    }
    let datafile = path.join('tmp', 'o2r', 'compendium', compendiumId, datasets[0].file.split('/').pop());
};

fn.saveResult = function(data, compendiumId, fileName) {
    debug('Start saving result for compendium %s under files name %s',
            compendiumId, fileName);
    fileName = fileName.replace(' ', '');
    fileName = fileName.replace('.', '_');
    fileName = fileName.replace(',', '_');
    if (!fs.existsSync(path.join('tmp', 'o2r', 'compendium', compendiumId))) {
        fs.mkdirSync(path.join('tmp', 'o2r', 'compendium', compendiumId));
    }
    fileName = path.join(fileName + '.R');
    fn.saveRFile(data, compendiumId, fileName);
    debug('End saving result');
};

fn.createRunFile = function(compendiumId, result, port) {
    debug('Start creating run file for compendium %s for result %s running under port %s',
            compendiumId, result, port);
    let content = 'library("plumber")' + '\n' +
                    'setwd(file.path("tmp", "o2r", "compendium", "' + compendiumId + '"))' + '\n' +
                    'path = paste("'+result + '.R", sep = "")\n' +
                    'r <- plumb(path)\n' +
                    'r$run(host = "0.0.0.0", port=' + port + ')';
    fn.saveRFile(content, compendiumId, result+'run.R');
    debug('End creating run file');
};

fn.saveRFile = function(data, compendiumId, fileName) {
    debug('Start saving file for compendium %s under file name %s',
            compendiumId, fileName);
    let dir = path.join('tmp', 'o2r', 'compendium', compendiumId, fileName);
    fs.writeFile(dir, data, 'utf8', function(err) {
        debug(err);
    });
    debug('End saving result under the directory %s', dir);
};

module.exports = fn;
