
//{{BLOCK(wallpaper)

//======================================================================
//
//	wallpaper, 256x192@8, 
//	+ palette 256 entries, not compressed
//	+ 728 tiles (t|f reduced) not compressed
//	+ regular map (flat), not compressed, 32x24 
//	Total size: 512 + 46592 + 1536 = 48640
//
//	Time-stamp: 2013-12-02, 16:21:23
//	Exported by Cearn's GBA Image Transmogrifier, v0.8.10
//	( http://www.coranac.com/projects/#grit )
//
//======================================================================

#ifndef GRIT_WALLPAPER_H
#define GRIT_WALLPAPER_H

#define wallpaperTilesLen 46592
extern const unsigned int wallpaperTiles[11648];

#define wallpaperMapLen 1536
extern const unsigned short wallpaperMap[768];

#define wallpaperPalLen 512
extern const unsigned short wallpaperPal[256];

#endif // GRIT_WALLPAPER_H

//}}BLOCK(wallpaper)
