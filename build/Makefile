GMCS = gmcs -r:System.Web.Extensions.dll -r:System.Web.dll

all: minimize cleanup

minifier:
	$(GMCS) minimize.cs

minimize: minifier
	mono minimize.exe ../dist/slick.grid-{0}.min.js "\"slickGridVersion\"\s*:\s*\"(.*?)\"" ../slick.grid.js
	mono minimize.exe ../dist/slick.grid-{0}.merged.min.js "\"slickGridVersion\"\s*:\s*\"(.*?)\""  ../lib/jquery.event.drag-2.0.min.js ../slick.grid.js

cleanup:
	rm -f minimize.exe

