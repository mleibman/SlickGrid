

var GlobalEditorState = new function()
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
            throw "GlobalEditorState : enterEditMode : currentEditor == null";
        
        if (!editor.commitCurrentEdit) 
            throw "GlobalEditorState : enterEditMode : editor must implement .commitCurrentEdit()";
        
        if (!editor.cancelCurrentEdit) 
            throw "GlobalEditorState : enterEditMode : editor must implement .cancelCurrentEdit()";
        
        currentEditor = editor;
    }
    
    
    this.leaveEditMode = function(editor)
    {
        if (currentEditor != editor) 
            throw "GlobalEditorState : leaveEditMode() : currentEditor != editor";
        
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

