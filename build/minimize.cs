using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Script.Serialization;


/// <summary>
/// Simple JavaScript minimizer (using Google's Closure Compiler) implementation.
/// </summary>
public static class Program
{

    //-------------------------------------------------
    /// <summary>
    /// Main entry point for the JavaScript minimizer.
    /// </summary>
    public static int Main(string[] args)
    {
        try
        {
            if (args.Length < 3)
            {
                throw new ArgumentException("Expected at least 3 arguments: outputFileName, versionRegex, file1, ...");
            }

            Minimize(args[0], args[1], args.Skip(2));
            return 0;
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("Failed");
            Console.Write(ex.GetType().FullName);
            Console.Write(": ");
            Console.WriteLine(ex.Message);
            Console.WriteLine(ex.StackTrace);
            return 1;
        }
        finally
        {
            Console.ResetColor();
        }
    }


    //-------------------------------------------------
    /// <summary>
    /// Helper extension method to query dictionary for
    /// the specified key and cast the value (if found)
    /// to the specified type in a single statement.
    /// </summary>
    private static T GetValueOrDefault<T>(this IDictionary<string, object> dict, string key)
    {
        object value;
        if (dict.TryGetValue(key, out value))
        {
            if (value == null || value is T)
            {
                return (T)value;
            }
            else
            {
                throw new InvalidCastException(string.Concat("Requested type \"", typeof(T).FullName, "\" is not compatible with actual type \"", value.GetType().FullName, "\""));
            }
        }
        else
        {
            return default(T);
        }
    }


    //-------------------------------------------------
    /// <summary>
    /// Create a user-readable list of messages from a list
    /// of JSON error/warning objects.
    /// </summary>
    private static void GatherIssues(ArrayList issues, string prefix, ICollection<string> messages)
    {
        if (issues != null)
        {
            foreach (var issue in issues)
            {
                var issueDict = (Dictionary<string, object>)issue;
                messages.Add(string.Concat(
                    prefix, " ", issueDict.GetValueOrDefault<string>("type"),
                    " (", issueDict.GetValueOrDefault<int>("lineno"), ", ", issueDict.GetValueOrDefault<int>("charno"), "): ",
                    issueDict.GetValueOrDefault<string>("error") ?? issueDict.GetValueOrDefault<string>("warning")));
            }
        }
    }


    //-------------------------------------------------
    /// <summary>
    /// Gather all the specified input files and call Google's
    /// Closure Compiler REST API with the combined script.
    /// </summary>
    private static void Minimize(string outputFileName, string versionRegex, IEnumerable<string> files)
    {
        // gather all input files into one ".orig" file
        Console.ForegroundColor = ConsoleColor.DarkGray;
        Console.Write("Gathering input files: ");
        var source = files.Select(f => File.ReadAllText(f)).Aggregate((s1,s2) => string.Concat(s1, Environment.NewLine, s2));
        source = source.Replace("\"use strict\";", string.Empty);
        var versionMatch = Regex.Match(source, versionRegex, RegexOptions.CultureInvariant | RegexOptions.Multiline);
        if (versionMatch.Success && versionMatch.Groups.Count > 1)
        {
            outputFileName = string.Format(CultureInfo.InvariantCulture, outputFileName, versionMatch.Groups[1].Value);
        }
        var outputFileNameDir = Path.GetDirectoryName(outputFileName);
        if (!string.IsNullOrEmpty(outputFileNameDir) && !Directory.Exists(outputFileNameDir)) // ensure target dir exists
        {
            Directory.CreateDirectory(outputFileNameDir);
        }
        var outputFileNameOrig = Path.ChangeExtension(outputFileName, string.Concat(".orig", Path.GetExtension(outputFileName)));
        if (File.Exists(outputFileNameOrig)) { File.SetAttributes(outputFileNameOrig, FileAttributes.Normal); } // ensure we can overwrite files marked as read-only
        File.WriteAllText(outputFileNameOrig, source);
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("OK");

        // run closure compiler
        Console.ForegroundColor = ConsoleColor.DarkGray;
        Console.Write("Calling Closure Compiler: ");
        var webClient = new WebClient();
        webClient.Headers.Add("Content-Type", "application/x-www-form-urlencoded");
        var request = string.Concat("compilation_level=SIMPLE_OPTIMIZATIONS&output_format=json&output_info=errors&output_info=warnings&output_info=compiled_code&js_code=", HttpUtility.UrlEncode(source));
        var response = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(webClient.UploadString("http://closure-compiler.appspot.com/compile", request));
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("OK");

        // check for compiler errors
        Console.ForegroundColor = ConsoleColor.DarkGray;
        Console.Write("Processing Compiler Response: ");
        var messages = new List<string>();
        GatherIssues(response.GetValueOrDefault<ArrayList>("errors"), "Error", messages);
        if (messages.Count > 0)
        {
            throw new InvalidOperationException(string.Concat("Compiler reported errors", Environment.NewLine, string.Join(Environment.NewLine, messages.ToArray())));
        }
        Console.ForegroundColor = ConsoleColor.Green;
        Console.Write("OK");

        // check for compiler warnings
        GatherIssues(response.GetValueOrDefault<ArrayList>("warnings"), "Warning", messages);
        if (messages.Count > 0)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine(string.Concat(" (", messages.Count, " warning", messages.Count == 1 ? ")" : "s)"));
            Console.WriteLine(string.Join(Environment.NewLine, messages.ToArray()));
        }
        else
        {
            Console.WriteLine(" (no errors or warnings)");
        }

        // write output file
        Console.ForegroundColor = ConsoleColor.DarkGray;
        Console.Write("Writing Minimized File: ");
        if (File.Exists(outputFileName)) { File.SetAttributes(outputFileName, FileAttributes.Normal); } // ensure we can overwrite files marked as read-only
        File.WriteAllText(outputFileName, response.GetValueOrDefault<string>("compiledCode"));
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("OK");
    }

}