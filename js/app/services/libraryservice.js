/**
 * ownCloud - Music app
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Pauli Järvinen <pauli.jarvinen@gmail.com>
 * @copyright 2017 - 2020 Pauli Järvinen
 *
 */

angular.module('Music').service('libraryService', ['$rootScope', function($rootScope) {

	var artists = null;
	var albums = null;
	var tracksIndex = {};
	var tracksInAlbumOrder = null;
	var tracksInAlphaOrder = null;
	var tracksInFolderOrder = null;
	var playlists = null;
	var folders = null;

	/** 
	 * Sort array according to a specified text field.
	 * Note:  The exact ordering is browser-dependant and usually affected by the browser language.
	 * Note2: The array is sorted in-place instead of returning a new array.
	 */
	function sortByTextField(items, field) {
		items.sort(function(a, b) {
			return a[field].localeCompare(b[field]);
		});
	}

	/**
	 * Like sortByTextField but to be used with arrays of playlist entries where
	 * field is within outer field "track".
	 */
	function sortByPlaylistEntryField(items, field) {
		items.sort(function(a, b) {
			return a.track[field].localeCompare(b.track[field]);
		});
	}

	function sortByYearNameAndDisc(aAlbums) {
		aAlbums = _.sortBy(aAlbums, 'disk');
		sortByTextField(aAlbums, 'name');
		aAlbums = _.sortBy(aAlbums, 'year');
		return aAlbums;
	}

	function sortByNumberAndTitle(tracks) {
		sortByTextField(tracks, 'title');
		tracks = _.sortBy(tracks, 'number');
		return tracks;
	}

	function sortCollection(collection) {
		sortByTextField(collection, 'name');
		_.forEach(collection, function(artist) {
			artist.albums = sortByYearNameAndDisc(artist.albums);
			_.forEach(artist.albums, function(album) {
				album.tracks = sortByNumberAndTitle(album.tracks);
			});
		});
		return collection;
	}

	function moveArrayElement(array, from, to) {
		array.splice(to, 0, array.splice(from, 1)[0]);
	}

	function playlistEntry(track) {
		return { track: track };
	}

	function playlistEntryFromId(trackId) {
		return playlistEntry(tracksIndex[trackId]);
	}

	function wrapPlaylist(playlist) {
		return {
			id: playlist.id,
			name: playlist.name,
			tracks: _.map(playlist.trackIds, playlistEntryFromId)
		};
	}

	function wrapFolder(folder) {
		var wrapped = wrapPlaylist(folder);
		wrapped.path = folder.path;
		return wrapped;
	}

	function createTrackContainers() {
		// add parent album ID to each track
		_.forEach(albums, function(album) {
			_.forEach(album.tracks, function(track) {
				track.albumId = album.id;
			});
		});

		// album order "playlist"
		var tracks = _.flatten(_.pluck(albums, 'tracks'));
		tracksInAlbumOrder = _.map(tracks, playlistEntry);

		// alphabetic order "playlist"
		sortByTextField(tracks, 'title');
		sortByTextField(tracks, 'artistName');
		tracksInAlphaOrder = _.map(tracks, playlistEntry);

		// tracks index
		_.forEach(tracks, function(track) {
			tracksIndex[track.id] = track;
		});
	}

	function search(container, field, query) {
		query = query.toLocaleLowerCase();
		return _.filter(container, function(item) {
			return (item[field] !== null
				&& item[field].toLocaleLowerCase().indexOf(query) !== -1);
		});
	}

	return {
		setCollection: function(collection) {
			artists = sortCollection(collection);
			albums = _.flatten(_.pluck(artists, 'albums'));
			createTrackContainers();
		},
		setPlaylists: function(lists) {
			playlists = _.map(lists, wrapPlaylist);
		},
		setFolders: function(folderData) {
			if (!folderData) {
				folders = null;
				tracksInFolderOrder = null;
			} else {
				folders = _.map(folderData, wrapFolder);
				sortByTextField(folders, 'name');
				_.forEach(folders, function(folder) {
					sortByPlaylistEntryField(folder.tracks, 'title');
					sortByPlaylistEntryField(folder.tracks, 'artistName');

					_.forEach(folder.tracks, function(trackEntry) {
						trackEntry.track.folderId = folder.id;
					});
				});
				tracksInFolderOrder = _.flatten(_.pluck(folders, 'tracks'));
			}
		},
		addPlaylist: function(playlist) {
			playlists.push(wrapPlaylist(playlist));
		},
		removePlaylist: function(playlist) {
			playlists.splice(playlists.indexOf(playlist), 1);
		},
		addToPlaylist: function(playlistId, trackId) {
			var playlist = this.getPlaylist(playlistId);
			playlist.tracks.push(playlistEntryFromId(trackId));
		},
		removeFromPlaylist: function(playlistId, indexToRemove) {
			var playlist = this.getPlaylist(playlistId);
			playlist.tracks.splice(indexToRemove, 1);
		},
		reorderPlaylist: function(playlistId, srcIndex, dstIndex) {
			var playlist = this.getPlaylist(playlistId);
			moveArrayElement(playlist.tracks, srcIndex, dstIndex);
		},
		getArtist: function(id) {
			return _.findWhere(artists, { id: Number(id) });
		},
		getAllArtists: function() {
			return artists;
		},
		getAlbum: function(id) {
			return _.findWhere(albums, { id: Number(id) });
		},
		getAlbumCount: function() {
			return albums ? albums.length : 0;
		},
		getTrack: function(id) {
			return tracksIndex[id];
		},
		getTracksInAlphaOrder: function() {
			return tracksInAlphaOrder;
		},
		getTracksInAlbumOrder: function() {
			return tracksInAlbumOrder;
		},
		getTracksInFolderOrder: function() {
			return tracksInFolderOrder;
		},
		getTrackCount: function() {
			return tracksInAlphaOrder ? tracksInAlphaOrder.length : 0;
		},
		getPlaylist: function(id) {
			return _.findWhere(playlists, { id: Number(id) });
		},
		getAllPlaylists: function() {
			return playlists;
		},
		getFolder: function(id) {
			return _.findWhere(folders, { id: Number(id) });
		},
		getAllFolders: function() {
			return folders;
		},
		findAlbumOfTrack: function(trackId) {
			return _.find(albums, function(album) {
				return _.findWhere(album.tracks, {id : Number(trackId)});
			});
		},
		findArtistOfAlbum: function(albumId) {
			return _.find(artists, function(artist) {
				return _.findWhere(artist.albums, {id : Number(albumId)});
			});
		},
		findFolderOfTrack: function(trackId) {
			return _.find(folders, function(folder) {
				return _.find(folder.tracks, function(i) { return i.track.id == Number(trackId); });
			});
		},
		collectionLoaded: function() {
			return artists !== null;
		},
		playlistsLoaded: function() {
			return playlists !== null;
		},
		foldersLoaded: function() {
			return folders !== null;
		},
		searchTracks: function(query, maxResults/*optional*/) {
			return OC_Music_Utils.limitedUnion(
				maxResults,
				search(tracksIndex, 'title', query),
				search(tracksIndex, 'artistName', query)
			);
		},
		searchAlbums: function(query, maxResults/*optional*/) {
			return OC_Music_Utils.limitedUnion(
				maxResults,
				search(albums, 'name', query),
				search(albums, 'year', query)
			);
		},
		searchArtists: function(query, maxResults/*optional*/) {
			return OC_Music_Utils.limitedUnion(
				maxResults,
				search(artists, 'name', query)
			);
		},
		searchFolders: function(query, maxResults/*optional*/) {
			return OC_Music_Utils.limitedUnion(
				maxResults,
				search(folders, 'path', query)
			);
		},
		searchTracksInPlaylist: function(playlistId, query, maxResults/*optional*/) {
			var list = this.getPlaylist(playlistId) || [];
			list = _.pluck(list.tracks, 'track');
			list = _.uniq(list);
			return OC_Music_Utils.limitedUnion(
				maxResults,
				search(list, 'title', query),
				search(list, 'artistName', query)
			);
		},
	};
}]);
