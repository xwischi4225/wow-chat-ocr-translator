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
    if (_gcpProject.isEmpty()) { Runtime.trap("Project ID must not be empty.") };
    apiKey := _apiKey;
    gcpProject := _gcpProject;
  };

  public query ({ caller }) func getConfigured() : async Bool {
    not apiKey.isEmpty() and not gcpProject.isEmpty();
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func translate(text : Text, targetLanguage : Text) : async Text {
    if (apiKey.isEmpty() or gcpProject.isEmpty()) {
      Runtime.trap("Translation configuration not set");
    };

    if (text.isEmpty()) {
      Runtime.trap("Input text cannot be empty");
    };

    let url = "https://us-central1-translation.googleapis.com/v3/projects/" #
      gcpProject #
      "/locations/global:translateText?key=" #
      apiKey;

    let body = "{" #
      "  \"sourceLanguageCode\": \"en\", " #
      "  \"targetLanguageCode\": \"" # targetLanguage # "\", " #
      "  \"contents\": [\"" # text # "\"]}";

    await OutCall.httpPostRequest(url, [], body, transform);
  };

  public shared ({ caller }) func getApiKey() : async Text {
    if (apiKey.isEmpty()) { Runtime.trap("API key is not set.") };
    apiKey;
  };

  public shared ({ caller }) func getProject() : async Text {
    if (gcpProject.isEmpty()) { Runtime.trap("Project ID is not set.") };
    gcpProject;
  };
};
