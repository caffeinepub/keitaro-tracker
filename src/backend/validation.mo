import Text "mo:core/Text";
import Runtime "mo:core/Runtime";

module {
  public func isValidTrafficSourceInput(name : Text, postbackUrl : Text) : Bool {
    if (name.isEmpty() or postbackUrl.isEmpty()) {
      Runtime.trap("Invalid traffic source input: Name and postback URL must not be empty");
    };
    true;
  };

  public func isValidDomainInput(name : Text) : Bool {
    if (name.isEmpty()) {
      Runtime.trap("Invalid domain input: Name must not be empty");
    };
    true;
  };
};
