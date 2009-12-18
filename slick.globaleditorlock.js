/***
 * A singleton for controlling access to the editing functionality for multiple components capable of editing the same data.
 */
var GlobalEditorLock = new function()
{
    var currentEditor = null;
    
    this.isEditing = function()
    {
        return (currentEditor != null);
    }
    
    this.hasLock = function(editor)
    {
        return (currentEditor == editor);
    }
    
    this.enterEditMode = function(editor)
    {
        if (currentEditor != null) 
            throw "GlobalEditorLock : enterEditMode : currentEditor == null";
        
        if (!editor.commitCurrentEdit) 
            throw "GlobalEditorLock : enterEditMode : editor must implement .commitCurrentEdit()";
        
        if (!editor.cancelCurrentEdit) 
            throw "GlobalEditorLock : enterEditMode : editor must implement .cancelCurrentEdit()";
        
        currentEditor = editor;
    }
    
    this.leaveEditMode = function(editor)
    {
        if (currentEditor != editor) 
            throw "GlobalEditorLock : leaveEditMode() : currentEditor != editor";
        
        currentEditor = null;
    }
    
    this.commitCurrentEdit = function()
    {
        if (currentEditor) 
            return currentEditor.commitCurrentEdit();
        
        return true;
    }
    
    this.cancelCurrentEdit = function()
    {
        if (currentEditor) 
            currentEditor.cancelCurrentEdit();
    }
};

