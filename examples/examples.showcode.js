//Show Code Javascript file.

//Autoload
$('document').ready(function(){
  $('#viewsource').on('click',function(){


    var pretag = $('#displaycode');

    if (pretag.html().length > 0){
      pretag.toggle();
    }
    else
    {

      var scripthtml = $('#script_tag_example').html();
      var escapedScript = pretag.text(scripthtml).html();
      pretag.html('<pre class=class="prettyprint language-js"><code class="prettyprint">' + escapedScript + '</code></pre>');
	  
      //call google prettify
	    PR.prettyPrint();
      pretag.toggle();
    }

   });
});