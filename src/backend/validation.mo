import Text "mo:core/Text";
import Runtime "mo:core/Runtime";

module {
  public func isValidTrafficSourceInput(name : Text, postbackUrl : Text) {
    if (name.isEmpty() or postbackUrl.isEmpty()) {
      Runtime.trap("Invalid traffic source input: Name and postback URL must not be empty");
    };
  };

  public func isValidDomainInput(name : Text) {
    if (name.isEmpty()) {
      Runtime.trap("Invalid domain input: Name must not be empty");
    };
  };
};
