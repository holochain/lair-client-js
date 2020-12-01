{ pkgs ? import ./nixpkgs.nix {} }:

with pkgs;

{
  holo-envoy = stdenv.mkDerivation rec {
    name = "lair-client-js";
    src = gitignoreSource ./.;

    buildInputs = [
      lair-keystore
    ];

    nativeBuildInputs = [
      nodejs
    ];

    preConfigure = ''
      cp -r ${npmToNix { inherit src; }} node_modules
      chmod -R +w node_modules
      patchShebangs node_modules
    '';

    buildPhase = false;

    installPhase = ''
      mkdir $out
      mv package*.json src node_modules $out
    '';

    fixupPhase = ''
      find $out/src -name '*~' -exec rm {} \;
      patchShebangs $out
    '';

    checkPhase = ''
      make test-unit
    '';

    doCheck = true;
  };
}
