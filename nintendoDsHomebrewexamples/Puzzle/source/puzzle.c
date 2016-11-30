/*
 * puzzle.c
 *
 *  Created on: 26-sep-2013
 *      Author: jfernand
 */

/* Este programa modifica aleatoriamente una imagen formada por teselas
 En este caso se tiene 4x3 bloque de teselas */

#include <nds.h>
#include <string.h>
#include "wallpaper.h"

void intercambia(int, int,int, int, uint16*);

int main()
{
  PrintConsole topScreen;
  int i;

	consoleDemoInit();
	// Codigo que inicializa la pantalla inferior y superior
	 REG_DISPCNT_SUB = MODE_0_2D | DISPLAY_BG0_ACTIVE;
	 REG_DISPCNT = MODE_0_2D | DISPLAY_BG0_ACTIVE;
	 vramSetBankA(VRAM_A_MAIN_BG);
	 VRAM_C_CR = VRAM_ENABLE | VRAM_C_SUB_BG;

	 BGCTRL_SUB[0] = BG_32x32 | BG_COLOR_256  | BG_MAP_BASE(0)  | BG_TILE_BASE(1);

	 BGCTRL[0] = BG_32x32 | BG_COLOR_256 | BG_MAP_BASE(0)  | BG_TILE_BASE(1);

	 static uint16 *mapa = BG_MAP_RAM_SUB(0);
	 static uint16 *solve= BG_MAP_RAM(0);

	//Foto en la pantalla de arriba para ver la solucion
	 dmaCopy(wallpaperPal,BG_PALETTE,wallpaperPalLen);
	 dmaCopy(wallpaperTiles, (void*)BG_TILE_RAM(1),wallpaperTilesLen);
	 dmaCopy(wallpaperMap, (void*)BG_MAP_RAM(0),wallpaperMapLen);

	//Foto en la pantalla de abajo para jugar
	 dmaCopy(wallpaperPal, BG_PALETTE_SUB, wallpaperPalLen);
	 dmaCopy(wallpaperTiles, (void*)BG_TILE_RAM_SUB(1), wallpaperTilesLen);
	 dmaCopy(wallpaperMap, (void*)BG_MAP_RAM_SUB(0), wallpaperMapLen);

	 consoleSelect(&topScreen);

      //Bucle para mezclar piezas
	 srand(time(NULL));
	 for(i=0;i<64;i++){
	 	intercambia((int)rand()%4,(int)rand()%3,(int)rand()%4,(int)rand()%3, mapa);
	 	}

	 while(1){
		    swiWaitForVBlank();
      }
}

  // Funcion que intercambia la imagen original en bloques de 4x3

void intercambia(int iniciox, int inicioy, int finx, int finy, uint16 *mapa){
  int i, j;
  int inicio = inicioy*32*8+iniciox*8;
    // inicioy=fila de la primera tesela de la pieza de origen
    // 32 teselas por fila
    // 8 teselas de largo por ficha
    // iniciox=columna de la primera tesela de la pieza origen
    // 8 teselas de ancho

  int fin = finy*32*8 + finx*8;
    // Lo mismo pero para la pieza de destino

  uint16 mapaAux[64]; //para las 64 teselas que se cambian de sitio

  for(i=0; i<8;i++){
    for(j=0; j<8; j++){
      mapaAux[i*8+j]=mapa[inicio+i*32+j];
      mapa[inicio+i*32+j]= mapa[fin + i*32+j];
      mapa[fin + i*32+j] =   mapaAux[i*8+j];
    }
  }

}
