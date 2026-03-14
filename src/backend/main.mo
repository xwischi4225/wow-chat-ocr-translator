import OutCall "http-outcalls/outcall";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Blob "mo:core/Blob";

actor {
  public type TransformContext = Blob;

  var apiKey : Text = "";
  var gcpProject : Text = "";

  public shared ({ caller }) func setConfig(_apiKey : Text, _gcpProject : Text) : async () {
    if (_apiKey.isEmpty()) { Runtime.trap("API key must not be empty.") };
    apiKey := _apiKey;
    gcpProject := _gcpProject;
  };

  public query ({ caller }) func getConfigured() : async Bool {
    not apiKey.isEmpty();
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  func extractTranslatedText(json : Text) : Text {
    let marker = "\"translatedText\":\"";
    let parts = json.split(#text marker);
    ignore parts.next();
    switch (parts.next()) {
      case null { Runtime.trap("translatedText not found in response: " # json) };
      case (?after) {
        var result = "";
        let chars = after.chars();
        label extractLoop loop {
          switch (chars.next()) {
            case null { break extractLoop };
            case (?'\"') { break extractLoop };
            case (?'\\') {
              switch (chars.next()) {
                case null { break extractLoop };
                case (?c) { result #= Text.fromChar(c) };
              };
            };
            case (?c) { result #= Text.fromChar(c) };
          };
        };
        result;
      };
    };
  };

  public shared ({ caller }) func translate(text : Text, targetLanguage : Text) : async Text {
    if (apiKey.isEmpty()) {
      Runtime.trap("Translation API key not set");
    };
    if (text.isEmpty()) {
      Runtime.trap("Input text cannot be empty");
    };

    let url = "https://translation.googleapis.com/language/translate/v2?key=" # apiKey;

    var safeText = "";
    for (c in text.chars()) {
      if (c == '\"') { safeText #= "\\\"" }
      else if (c == '\\') { safeText #= "\\\\" }
      else { safeText #= Text.fromChar(c) };
    };

    let body = "{" #
      "\"q\": \"" # safeText # "\"," #
      "\"target\": \"" # targetLanguage # "\"," #
      "\"format\": \"text\"}";
    let headers = [
      { name = "Content-Type"; value = "application/json" },
    ];
    let rawResponse = await OutCall.httpPostRequest(url, headers, body, transform);
    extractTranslatedText(rawResponse);
  };

  public shared ({ caller }) func getApiKey() : async Text {
    if (apiKey.isEmpty()) { Runtime.trap("API key is not set.") };
    apiKey;
  };

  public shared ({ caller }) func getProject() : async Text {
    gcpProject;
  };
};
