import * as vscode from 'vscode';
import { StringifyResult } from './stringifyResult';
import * as stringify from 'json-stable-stringify';

export function formatTextEditorCommand(textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit){
  let error: boolean = false;
  if(textEditor.selections.length === 1 && textEditor.selections[0].isEmpty) {
    // There's no selection - do the whole doc.
    const text: string = textEditor.document.getText();
    if (text.length < 2) {
      // All JSON is at least two characters, even empty string/object. If it's a single-digit number,
      // there's arguably nothing to sort anyway.
      return;
    }

    const sorted: StringifyResult = sortJson(text, textEditor.options, new vscode.Position(1, 1));
    error = !sorted.success;
    if (sorted.success) {
      const lastLine: number = textEditor.document.lineCount - 1;
      const textRange: vscode.Range = new vscode.Range(0,
        textEditor.document.lineAt(0).range.start.character,
        lastLine,
        textEditor.document.lineAt(lastLine).range.end.character);
      edit.replace(textRange, sorted.result);
    }
  }
  else {
    // There are selections - iterate through each.
    for(const selection of textEditor.selections) {
      if(selection.isEmpty) {
        // No text to transform.
        continue;
      }

      const text: string = textEditor.document.getText(selection);
      if(text.length < 2) {
      // All JSON is at least two characters, even empty string/object. If it's a single-digit number,
      // there's arguably nothing to sort anyway.
        continue;
      }

      const sorted: StringifyResult = sortJson(text, textEditor.options, selection.start);
      if (!sorted.success) {
        error = true;
        continue;
      }

      edit.replace(selection, sorted.result);
    }
  }

  if (error) {
    vscode.window.showErrorMessage('Error during JSON sort. See JavaScript console for details (Help => Toggle Developer Tools).');
  }
}

function sortJson(original: string, editorOptions: vscode.TextEditorOptions, start: vscode.Position) : StringifyResult {
  const opts: stringify.Options = {
    space: editorOptions.insertSpaces ? editorOptions.tabSize : '\t',
  };

  let sorted: string = '';
  let success: boolean = false;
  try {
    sorted = stringify(JSON.parse(original), opts);
    success = true;
  } catch (e) {
    console.error('Error doing stable stringify of JSON content at line ' + start.line + ', char ' + start.character + ':');
    console.error(e);
    console.error('Content:');
    console.error(original);
  }

  return new StringifyResult(success, sorted);
}

