/***
 * Contains basic SlickGrid editors.
 * @module Editors
 * @namespace Slick
 */

(function ($) {
  // register namespace
  $.extend(true, window, {
    "Slick": {
      "Editors": {
          "MultiSelectCheckBox": MultiSelectDropdownEditor
      }
    }
  });
 
  /*
   * An example of a "Multi-Select Dropdown" editor.
   * The UI is added onto document BODY and .position(), .show() and .hide() are implemented.
   * KeyDown events are also handled to provide handling for Tab, Shift-Tab, Esc and Ctrl-Enter.
   */

  function MultiSelectDropdownEditor(args) {
      var $input, $wrapper,$checkBoxInput, selectedchkBoxArray=[];
      var defaultValue;
      var scope = this;
      // check scope get this value
        
      var chkBoxListData = getChkBoxDataList(args);
      var chkBoxAllValues = chkBoxListData.AllValues;
	  chkBoxAllValues.sort();
      var selectedchkBox = chkBoxListData.SelectedValues;
	  if(!(selectedchkBox == undefined || selectedchkBox == '')){
	  if(selectedchkBox.length>0) selectedchkBoxArray = selectedchkBox.split(";");
	  }
      this.init = function () {
          
		  if(chkBoxAllValues.length!=0){
          var $container = $("body");
          $wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
          .appendTo($container);
          
          for (var i = 0; i < chkBoxAllValues.length; i++) {
			  if(!(selectedchkBoxArray == undefined || selectedchkBoxArray == '')){
              if (selectedchkBoxArray.length>0 && selectedchkBoxArray.indexOf(chkBoxAllValues[i]) > -1){
                  $checkBoxInput = $("<input class='chkBox' type='checkbox' name='" + chkBoxAllValues[i] + "' id='chkBox_" + i + "' checked='checked'/>" + chkBoxAllValues[i] + "<br />");
			  }
			   else
                  $checkBoxInput = $("<input class='chkBox' type='checkbox' name='" + chkBoxAllValues[i] + "' id='chkBox_" + i + "'/>" + chkBoxAllValues[i] + "<br />");
			  }
              else
                  $checkBoxInput = $("<input class='chkBox' type='checkbox' name='" + chkBoxAllValues[i] + "' id='chkBox_" + i + "'/>" + chkBoxAllValues[i] + "<br />");

              $wrapper.append($checkBoxInput);
          }

          $wrapper.append("<br/><br/>");

          $input = $("<TEXTAREA style='display:none;' hidefocus rows=25 style='background:white;width:150px;height:100px;border:1px solid;outline:0'>")
          .appendTo($wrapper);

          $("<DIV style='text-align:right'><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>")
              .appendTo($wrapper);

          $wrapper.find("button:first").on("click", this.save);
          $wrapper.find("button:last").on("click", this.cancel);
          $input.on("keydown", this.handleKeyDown);
		  }
		  else{
			  
			  alert("Dropdown list is empty. Kindly provide data for this dropdown list");
		  }
          scope.position(args.position);
          $input.focus().select();

          $('input[type="checkbox"]').change(function () {
              var name = $(this).prop('name');
              var chkboxId = $(this).prop('id');
              var check = $(this).prop('checked');
              var currentValue = $input.val();
              if (check) {
                  var allSelectedValues = '';
                   $('input[type="checkbox"]').each(function () {
                      var isChecked = $(this).prop('checked');
                      var name = $(this).prop('name');
                      var currentChekBoxId = $(this).prop('id');
                      if (isChecked) {
                          if (allSelectedValues.length == 0)  allSelectedValues = name;
                          else allSelectedValues = allSelectedValues + ";" + name;
                      }
                  });
                  $input.val('');
                  $input.val(allSelectedValues);
              }
              else {
                  var allSelectedValues = '';
                  $('input[type="checkbox"]').each(function () {
                      var isChecked = $(this).prop('checked');
					
                      var name = $(this).prop('name');
                      var currentChekBoxId = $(this).prop('id');
                      if (isChecked) {
                          if (allSelectedValues.length == 0) allSelectedValues = name;
                          else allSelectedValues = allSelectedValues + ";" + name;
                      }
                  });
                  $input.val('');
                  $input.val(allSelectedValues);
                   }
           });
 				  var allSelValues = '';
                  $('input[type="checkbox"]').each(function () {
                      var isChecked = $(this).prop('checked');
					 
                      var name = $(this).prop('name');
                      var currentChekBoxId = $(this).prop('id');
                      if (isChecked) {
                          if (allSelValues.length == 0) allSelValues = name;
                          else allSelValues = allSelValues + ";" + name;
                      }
                  });
                  $input.val('');
                  $input.val(allSelValues);
	  };

      this.handleKeyDown = function (e) {
          if (e.which == $.ui.keyCode.ENTER && e.ctrlKey) {
              scope.save();
          } else if (e.which == $.ui.keyCode.ESCAPE) {
              e.preventDefault();
              scope.cancel();
          } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
              e.preventDefault();
              args.grid.navigatePrev();
          } else if (e.which == $.ui.keyCode.TAB) {
              e.preventDefault();
              args.grid.navigateNext();
          }
      };

      this.save = function () {
          args.commitChanges();
          $wrapper.hide();
      };

      this.cancel = function () {
          $input.val(defaultValue);
          args.cancelChanges();
      };

      this.hide = function () {
          $wrapper.hide();
      };

      this.show = function () {
          $wrapper.show();
      };

      this.position = function (position) {
          $wrapper
              .css("top", position.top - 5)
              .css("left", position.left - 5)
      };

      this.destroy = function () {
          $wrapper.remove();
      };

      this.focus = function () {
         $input.focus();
      };

      this.loadValue = function (item) {
          $input.val(defaultValue = item[args.column.field]);
      };

      this.serializeValue = function () {
          return $input.val();
      };

      this.applyValue = function (item, state) {
          item[args.column.field] = state;
      };

      this.isValueChanged = function () {
          return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
      };

      this.validate = function () {
          if (args.column.validator) {
              var validationResults = args.column.validator($input.val());
              if (!validationResults.valid) {
                  return validationResults;
              }
          }

          return {
              valid: true,
              msg: null
          };
      };

      this.init();
  }


})(jQuery);
